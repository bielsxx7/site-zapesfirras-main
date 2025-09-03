document.addEventListener('DOMContentLoaded', () => {

    // --- PROTEÇÃO DE TELA E BOAS-VINDAS ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return; 
    }
    const capitalizedUser = loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);
    document.getElementById('admin-user-name').textContent = `Olá, ${capitalizedUser}`;

    // --- CONEXÃO COM O SERVIDOR EM TEMPO REAL ---
    const socket = io('http://localhost:3000');

    // --- OUVINTE DE EVENTOS EM TEMPO REAL ---
    socket.on('new_order', (newOrder) => {
        console.log('Novo pedido recebido via WebSocket:', newOrder);
        
        state.orders.unshift(newOrder);
        
        notificationSound.play().catch(e => console.log("Autoplay de áudio bloqueado. Clique na página para ativar."));
        
        showNotification(`Novo pedido #${newOrder.id} recebido!`, 'success');
        
        if(state.currentView === 'pedidos' || state.currentView === 'dashboard') {
             renderView(state.currentView);
        }
    });

    // --- STATE MANAGEMENT ---
    let state = {
        orders: [],
        menu: {},
        categories: [],
        currentView: 'dashboard',
        selectedOrderId: null,
        collapsedSections: new Set(['Finalizado']),
        theme: 'light',
        deliveryCounter: 0,
        lastCounterResetDate: null
    };

    // --- ELEMENT SELECTORS ---
    const pageTitle = document.getElementById('page-title');
    const notificationSound = document.getElementById('notification-sound');
    const menuToggle = document.getElementById('menu-toggle');
    let isAudioUnlocked = false;

    // --- DADOS DE EXEMPLO (MOCK DATA) PARA PEDIDOS ---
    const initialMockOrders = [
        { id: 1001, status: "Novo", client_info: { nome: "Fernanda Lima" }, total_value: 45.50, created_at: new Date().toISOString(), delivery_number: "F01", delivery_info: { tipo: "Entrega", rua: "Rua das Palmeiras", numero: "789", bairro: "Jardim das Rosas", complemento: "Casa"}, payment_info: { metodo: "Pix", detalhes: "Online"}, items: JSON.stringify([{name: "Combo Família", quantity: 1, price: 45.50}]) },
        { id: 1002, status: "Em Preparo", client_info: { nome: "Roberto Carlos" }, total_value: 18.50, created_at: new Date().toISOString(), delivery_number: "F02", delivery_info: { tipo: "Retirada", rua: "Retirar no local"}, payment_info: { metodo: "Dinheiro", detalhes: "Troco para R$ 20,00"}, items: JSON.stringify([{name: "Beirute de Filé", quantity: 1, price: 18.50}]) },
    ];

    // --- DATA & THEME PERSISTENCE ---
    function loadData() { 
        const savedState = JSON.parse(localStorage.getItem('zapEsfirrasAdminState')); 
        if (savedState && savedState.orders && savedState.orders.length > 0) { 
            state.orders = savedState.orders; 
            state.deliveryCounter = savedState.deliveryCounter || 0;
            state.lastCounterResetDate = savedState.lastCounterResetDate || null;
        } else {
            state.orders = initialMockOrders;
        }
    }
    
    function saveTheme() { localStorage.setItem('zapEsfirrasTheme', state.theme); }
    function loadTheme() { const savedTheme = localStorage.getItem('zapEsfirrasTheme') || 'light'; applyTheme(savedTheme); }
    
    function applyTheme(theme) {
        state.theme = theme;
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${theme}-mode`);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) { themeToggle.checked = theme === 'dark'; }
        saveTheme();
    }

    async function fetchCategoriesAndProducts() {
        try {
            const categoriesResponse = await fetch('http://localhost:3000/api/admin/categories');
            if (!categoriesResponse.ok) throw new Error('Falha ao buscar categorias.');
            state.categories = await categoriesResponse.json();

            const productsResponse = await fetch('http://localhost:3000/api/products');
            if (!productsResponse.ok) throw new Error('Falha ao buscar produtos.');
            const productsFromDB = await productsResponse.json();
            
            state.menu = productsFromDB.reduce((acc, product) => {
                const categoryName = product.category_name;
                if (!acc[categoryName]) {
                    acc[categoryName] = [];
                }
                product.available = !!product.available;
                acc[categoryName].push(product);
                return acc;
            }, {});

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showNotification("Erro: Não foi possível carregar os dados. Verifique se o servidor back-end está rodando.", "error");
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function renderView(viewName) {
        document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
        const viewElement = document.getElementById(`view-${viewName}`);
        viewElement.classList.add('active');
        pageTitle.textContent = document.querySelector(`.nav-link[data-view="${viewName}"] span`).textContent;
        state.currentView = viewName;
        viewElement.innerHTML = '';
        const renderMap = { dashboard: renderDashboard, pedidos: renderPedidosView, cardapio: renderCardapioView, relatorios: renderRelatoriosView, configuracoes: renderConfiguracoesView };
        renderMap[viewName]();
    }
    
    function renderDashboard() { const viewElement = document.getElementById('view-dashboard'); const ordersToday = state.orders; const revenueToday = ordersToday.reduce((sum, order) => sum + (order.total_value || 0), 0); viewElement.innerHTML = ` <div class="dashboard-grid"> <div class="stat-card"> <div class="stat-card-header"> <div class="icon faturamento-hoje"><ion-icon name="cash-outline"></ion-icon></div> <span>Faturamento Hoje</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueToday)}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon pedidos-hoje"><ion-icon name="receipt-outline"></ion-icon></div> <span>Pedidos Hoje</span> </div> <div class="stat-card-main-value">${ordersToday.length}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon mes-atual"><ion-icon name="calendar-outline"></ion-icon></div> <span>Vendas Mês Atual</span> </div> <div class="stat-card-main-value">R$ 0,00</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon mes-anterior"><ion-icon name="archive-outline"></ion-icon></div> <span>Vendas Mês Anterior</span> </div> <div class="stat-card-main-value">R$ 0,00</div> </div> </div>`; }
    function renderPedidosView() { const viewElement = document.getElementById('view-pedidos'); const statuses = ['Novo', 'Em Preparo', 'Prontos', 'Em Entrega', 'Finalizado']; const statusConfig = { 'Novo': { icon: 'sparkles-outline', title: 'Novos Pedidos' },'Em Preparo': { icon: 'flame-outline', title: 'Em Preparo' }, 'Prontos': { icon: 'checkmark-done-outline', title: 'Prontos (Retirada)' }, 'Em Entrega': { icon: 'bicycle-outline', title: 'Em Entrega' }, 'Finalizado': { icon: 'archive-outline', title: 'Finalizados' } }; viewElement.innerHTML = `<div class="pedidos-layout"><div class="pedidos-lista-vertical">${statuses.map(status => renderOrderStatusSection(status, statusConfig[status])).join('')}</div><div class="pedidos-detalhes-coluna" id="pedidos-detalhes-coluna"></div></div>`; renderOrderDetails(state.selectedOrderId); }
    function renderOrderStatusSection(status, config) { const ordersInSection = state.orders.filter(order => order.status === status); const isCollapsed = state.collapsedSections.has(status); return `<div class="status-section ${isCollapsed ? 'collapsed' : ''}" data-status="${status}"><div class="section-header"><ion-icon name="${config.icon}"></ion-icon><h3>${config.title}</h3><span class="count">${ordersInSection.length}</span><ion-icon name="chevron-down-outline" class="toggle-arrow"></ion-icon></div><div class="section-body">${ordersInSection.length > 0 ? ordersInSection.map(renderOrderCard).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 16px 0;">Nenhum pedido nesta etapa.</p>'}</div></div>`; }
    function renderOrderCard(order) { let actionButtonHTML = ''; if (order.status === 'Novo') { actionButtonHTML = `<button class="btn btn-primary action-button" data-order-id="${order.id}" data-next-status="Em Preparo"><ion-icon name="checkmark-outline"></ion-icon>Aceitar Pedido</button>`; } else if (order.status === 'Em Preparo') { actionButtonHTML = order.delivery_info.tipo === 'Entrega' ? `<button class="btn action-button dispatch" data-order-id="${order.id}" data-next-status="Em Entrega"><ion-icon name="bicycle-outline"></ion-icon>Despachar Pedido</button>` : `<button class="btn action-button ready" data-order-id="${order.id}" data-next-status="Prontos"><ion-icon name="checkmark-outline"></ion-icon>Pedido Pronto</button>`; } else if (order.status === 'Prontos' || order.status === 'Em Entrega') { actionButtonHTML = `<button class="btn action-button complete" data-order-id="${order.id}" data-next-status="Finalizado"><ion-icon name="archive-outline"></ion-icon>Finalizar</button>`; } let addressHTML = ''; if (order.delivery_info.tipo === 'Entrega') { const { rua, numero, bairro, complemento } = order.delivery_info; addressHTML = `<div class="order-card-address"><p><ion-icon name="location-outline"></ion-icon> <b>Rua:</b> ${rua}, ${numero}</p><p><b>Bairro:</b> ${bairro}</p>${complemento ? `<p><b>Comp:</b> ${complemento}</p>` : ''}</div>`; } const isNew = order.status === 'Novo'; const time = new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); return `<div class="order-card ${state.selectedOrderId == order.id ? 'active' : ''} ${isNew ? 'new-order' : ''}" data-order-id="${order.id}"><div class="order-card-header"><b>#${order.id}</b><span>${formatCurrency(order.total_value)}</span></div><p class="order-card-customer">${order.client_info.nome}</p>${addressHTML}<div class="order-card-info"><span><ion-icon name="time-outline"></ion-icon>${time}</span><span><ion-icon name="${order.delivery_info.tipo === 'Entrega' ? 'bicycle-outline' : 'walk-outline'}"></ion-icon>${order.delivery_info.tipo}</span></div><div class="order-card-footer">${actionButtonHTML}</div></div>`; }
    function renderOrderDetails(orderId) { const detailsColumn = document.getElementById('pedidos-detalhes-coluna'); const order = state.orders.find(o => o.id == orderId); if (!order) { detailsColumn.innerHTML = `<div class="placeholder-detalhes"><ion-icon name="receipt-outline"></ion-icon><h3>Selecione um Pedido</h3><p>Clique em um card para ver os detalhes.</p></div>`; return; } const address = order.delivery_info.tipo === 'Retirada' ? '<p><b>Endereço:</b> Retirar no local</p>' : `<p><b>Endereço:</b> ${order.delivery_info.rua}, ${order.delivery_info.numero}</p><p><b>Bairro:</b> ${order.delivery_info.bairro}</p>${order.delivery_info.complemento ? `<p><b>Comp:</b> ${order.delivery_info.complemento}</p>` : ''}`; const items = (typeof order.items === 'string') ? JSON.parse(order.items) : (order.items || []); detailsColumn.innerHTML = ` <div class="details-content"> <div class="details-header"><h3>Pedido #${order.id}</h3><span class="status-tag ${getStatusClass(order.status)}">${order.status}</span></div> <div class="details-card-header"><ion-icon name="person-outline"></ion-icon>Cliente</div> <div class="details-card-body"><p><b>Nome:</b> ${order.client_info.nome}</p></div> <div class="details-card-header"><ion-icon name="location-outline"></ion-icon>Entrega</div> <div class="details-card-body"><p><b>Tipo:</b> ${order.delivery_info.tipo}</p>${address}</div> <div class="details-card-header"><ion-icon name="fast-food-outline"></ion-icon>Itens</div> <div class="details-card-body"> ${items.map(item => `<div class="order-item-row"><span>${item.quantity || 1}x ${item.name || 'Item não encontrado'}</span><span>${formatCurrency(item.price * item.quantity)}</span></div>`).join('')} <div class="details-total-row"><span>Total</span><span>${formatCurrency(order.total_value)}</span></div> </div> <div class="details-card-header"><ion-icon name="wallet-outline"></ion-icon>Pagamento</div> <div class="details-card-body"><p><b>Método:</b> ${order.payment_info.metodo || 'Não informado'}</p>${order.payment_info.detalhes ? `<p><b>Detalhes:</b> ${order.payment_info.detalhes}</p>` : ''}</div> </div> <div class="details-footer"><button class="btn btn-primary print-button"><ion-icon name="print-outline"></ion-icon>Imprimir</button></div>`; }
    function renderCardapioView() { const viewElement = document.getElementById('view-cardapio'); const sortedCategories = [...state.categories]; let categoriesHTML = sortedCategories.map(category => { const productsInCategory = state.menu[category.name] || []; return ` <div class="category-section" data-category-name="${category.name.toLowerCase()}"> <h3 class="category-header"> <span>${category.name}</span> <div class="category-actions"> <button class="btn-category-action btn-edit-category" data-category-id="${category.id}" title="Renomear Categoria"> <ion-icon name="pencil-outline"></ion-icon> </button> <button class="btn-category-action btn-toggle-visibility ${!category.is_visible ? 'invisible' : ''}" data-category-id="${category.id}" title="${category.is_visible ? 'Tornar Invisível' : 'Tornar Visível'}"> <ion-icon name="${category.is_visible ? 'eye-outline' : 'eye-off-outline'}"></ion-icon> </button> <button class="btn-category-action btn-delete-category" data-category-id="${category.id}" data-category-name="${category.name}" title="Excluir Categoria"> <ion-icon name="trash-outline"></ion-icon> </button> </div> </h3> <div class="product-grid"> ${productsInCategory.map(createProductCardHTML).join('')} </div> </div>`; }).join(''); viewElement.innerHTML = ` <div class="view-header"> <div><h2>Cardápio</h2><p>Gerencie os produtos e categorias.</p></div> <div class="category-search-container"> <ion-icon name="search-outline"></ion-icon> <input type="search" id="category-search-input" placeholder="Pesquisar Categoria..."> </div> <div class="view-header-actions"> <button class="btn btn-secondary" id="add-new-category-btn"><ion-icon name="add-outline"></ion-icon>Nova Categoria</button> <button class="btn btn-primary" id="add-new-product-btn"><ion-icon name="add-outline"></ion-icon>Adicionar Produto</button> </div> </div> <div class="cardapio-grid">${categoriesHTML}</div>`; }
    function createProductCardHTML(product) { return `<div class="product-card" data-product-id="${product.id}"><div class="product-options"><button class="options-button"><ion-icon name="ellipsis-vertical"></ion-icon></button><div class="options-menu"><button class="edit-product-btn" data-product-id="${product.id}">Editar</button><button class="delete-product-btn delete-btn" data-product-id="${product.id}">Excluir</button></div></div><img src="${product.image || 'assets/placeholder.png'}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x160.png?text=Sem+Imagem';"><div class="product-info"><h4>${product.name}</h4><p class="price">${formatCurrency(product.price)}</p><p class="description">${product.description || 'Sem descrição.'}</p></div><div class="product-actions"><div class="product-availability-switch"><span>Disponível</span><label class="switch"><input type="checkbox" class="availability-toggle" data-product-id="${product.id}" ${product.available ? 'checked' : ''}><span class="slider"></span></label></div></div></div>`; }
    function renderRelatoriosView() { const viewElement = document.getElementById('view-relatorios'); viewElement.innerHTML = `<div class="view-header"><h2>Relatórios</h2><p>Analise o desempenho de suas vendas.</p></div><div class="report-container"><p>Funcionalidade de relatórios será implementada em breve.</p></div>`; }
    function renderConfiguracoesView() { const viewElement = document.getElementById('view-configuracoes'); viewElement.innerHTML = `<div class="view-header"><h2>Configurações</h2><p>Ajustes gerais do painel e da loja.</p></div><div class="settings-grid"><div class="settings-card"><h3>Aparência</h3><div class="setting-item"><label for="theme-toggle">Modo Escuro</label><label class="switch"><input type="checkbox" id="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}><span class="slider"></span></label></div></div></div>`; }
    function openProductModal(productData = null) { const modal = document.getElementById('product-modal-overlay'); const title = document.getElementById('modal-title'); const form = document.getElementById('product-form'); const imagePreview = document.getElementById('image-preview'); form.reset(); document.getElementById('product-id').value = ''; imagePreview.src = 'https://via.placeholder.com/150x150.png?text=Sem+Imagem'; const categorySelect = document.getElementById('product-category'); categorySelect.innerHTML = '<option value="" disabled>Selecione uma categoria</option>'; state.categories.forEach(category => { const selected = productData && productData.category_id === category.id ? 'selected' : ''; categorySelect.innerHTML += `<option value="${category.id}" ${selected}>${category.name}</option>`; }); if (!productData) categorySelect.selectedIndex = 0; if (productData) { title.textContent = "Editar Produto"; document.getElementById('product-id').value = productData.id; document.getElementById('product-name').value = productData.name; document.getElementById('product-price').value = productData.price; document.getElementById('product-description').value = productData.description; if (productData.image) imagePreview.src = productData.image; } else { title.textContent = "Adicionar Novo Produto"; } modal.classList.add('visible'); }
    async function saveProduct(e) { e.preventDefault(); const id = document.getElementById('product-id').value; const productData = { name: document.getElementById('product-name').value, price: parseFloat(document.getElementById('product-price').value), category_id: parseInt(document.getElementById('product-category').value), description: document.getElementById('product-description').value, image: document.getElementById('image-preview').src, available: true }; try { let response; if (id) { response = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) }); if (!response.ok) throw new Error('Falha ao atualizar o produto.'); showNotification('Produto atualizado com sucesso!', 'success'); } else { response = await fetch('http://localhost:3000/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) }); if (!response.ok) throw new Error('Falha ao criar o produto.'); showNotification('Produto adicionado com sucesso!', 'success'); } closeProductModal(); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao salvar produto:', error); showNotification(error.message, 'error'); } }
    function closeProductModal() { document.getElementById('product-modal-overlay').classList.remove('visible'); }
    function openConfirmModal(productId) { const modal = document.getElementById('confirm-modal-overlay'); modal.dataset.productIdToDelete = productId; modal.classList.add('visible'); }
    function closeConfirmModal() { document.getElementById('confirm-modal-overlay').classList.remove('visible'); }
    async function deleteProduct(productId) { try { const response = await fetch(`http://localhost:3000/api/products/${productId}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Falha ao excluir o produto.'); showNotification('Produto excluído com sucesso!', 'success'); closeConfirmModal(); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao excluir produto:', error); showNotification(error.message, 'error'); } }
    async function renameCategory(categoryId) { const category = state.categories.find(c => c.id === categoryId); if (!category) return; const newName = prompt(`Digite o novo nome para a categoria "${category.name}":`, category.name); if (newName && newName.trim() !== '' && newName !== category.name) { try { const updatedCategory = { ...category, name: newName.trim() }; const response = await fetch(`http://localhost:3000/api/categories/${categoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCategory) }); if (!response.ok) throw new Error('Falha ao renomear a categoria.'); showNotification('Categoria renomeada com sucesso!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao renomear categoria:', error); showNotification(error.message, 'error'); } } }
    async function toggleCategoryVisibility(categoryId) { const category = state.categories.find(c => c.id === categoryId); if (!category) return; try { const updatedCategory = { ...category, is_visible: !category.is_visible }; const response = await fetch(`http://localhost:3000/api/categories/${categoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCategory) }); if (!response.ok) throw new Error('Falha ao alterar a visibilidade.'); showNotification('Visibilidade da categoria alterada!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao alterar visibilidade:', error); showNotification(error.message, 'error'); } }
    async function createNewCategory() { const name = prompt("Digite o nome da nova categoria:"); if (name && name.trim() !== '') { try { const response = await fetch('http://localhost:3000/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }); if (!response.ok) throw new Error('Falha ao criar a categoria.'); showNotification('Nova categoria criada com sucesso!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao criar categoria:', error); showNotification(error.message, 'error'); } } }
    async function deleteCategory(categoryId, categoryName) { const confirmation = confirm(`Tem certeza que deseja excluir a categoria "${categoryName}"? Esta ação não pode ser desfeita.`); if (confirmation) { try { const response = await fetch(`http://localhost:3000/api/categories/${categoryId}`, { method: 'DELETE' }); const result = await response.json(); if (!response.ok) { throw new Error(result.message); } showNotification('Categoria excluída com sucesso!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao excluir categoria:', error); showNotification(error.message, 'error'); } } }
    function directPrint(orderToPrint) { if (!orderToPrint) { showNotification("Pedido não encontrado para impressão.", "error"); return; } const now = new Date(orderToPrint.created_at); const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`; const deliveryTime = new Date(now.getTime() + 45 * 60000).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); const receiptStyle = ` <style> body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; width: 72mm; color: #000; margin: 0; padding: 0; font-weight: bold; } .receipt-container { padding: 4mm; } h3, h4, p, span { margin: 0; padding: 0; } .center { text-align: center; } h3 { font-size: 16px; margin-bottom: 5px; } .delivery-number { font-size: 24px; margin: 8px 0; } .line { border-top: 1px dashed #000; margin: 8px 0; } table { width: 100%; border-collapse: collapse; font-size: 11px; } th, td { text-align: left; vertical-align: top; padding: 1px 0;} .col-qty { width: 10%; } .col-item { width: 65%; } .col-price { width: 25%; text-align: right; } .summary { text-align: right; font-size: 12px; } .final-total { font-size: 15px; } pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: 'Courier New', Courier, monospace; font-weight: bold;} </style> `; let itemsHTML = ''; let subtotal = 0; (JSON.parse(orderToPrint.items) || []).forEach(item => { const itemTotal = item.price * item.quantity; subtotal += itemTotal; itemsHTML += ` <tr> <td class="col-qty">${item.quantity}x</td> <td class="col-item">${item.name}</td> <td class="col-price">${formatCurrency(itemTotal)}</td> </tr> `; if (item.observacao) { itemsHTML += `<tr><td></td><td colspan="2" style="font-size:10px;">Obs: ${item.observacao}</td></tr>`; } }); const taxaEntrega = orderToPrint.delivery_info.tipo === 'Entrega' ? 5.00 : 0; const receiptHTML = ` <html> <head><title>Cupom Pedido #${orderToPrint.id}</title>${receiptStyle}</head> <body> <div class="receipt-container"> <h3 class="center">ZAP ESFIRRAS</h3> ${orderToPrint.delivery_number ? `<h3 class="center delivery-number">${orderToPrint.delivery_number}</h3>` : ''} <p class="center">Rua Exemplo, 123 - Centro</p> <p class="center">Tel: (19) 99999-8888</p> <div class="line"></div> <p><strong>PEDIDO: #${orderToPrint.id}</strong></p> <p>Data: ${formattedDate}</p> <p>Entrega prevista: ${deliveryTime}</p> <div class="line"></div> <h4>ENTREGA / RETIRADA</h4> <p><strong>Cliente:</strong> ${orderToPrint.client_info.nome || 'Nao informado'}</p> <p><strong>Tipo:</strong> ${orderToPrint.delivery_info.tipo}</p> ${orderToPrint.delivery_info.tipo === 'Entrega' ? ` <p>${orderToPrint.delivery_info.rua}, ${orderToPrint.delivery_info.numero}</p> <p>${orderToPrint.delivery_info.bairro}</p> ${orderToPrint.delivery_info.complemento ? `<p>${orderToPrint.delivery_info.complemento}</p>` : ''} ` : ''} <div class="line"></div> <h4>ITENS DO PEDIDO (${(JSON.parse(orderToPrint.items) || []).reduce((a, b) => a + b.quantity, 0)})</h4> <table><tbody>${itemsHTML}</tbody></table> <div class="line"></div> <div class="summary"> <p>Subtotal: ${formatCurrency(subtotal)}</p> <p>Taxa de entrega: ${formatCurrency(taxaEntrega)}</p> <p class="final-total"><strong>TOTAL: ${formatCurrency(orderToPrint.total_value)}</strong></p> </div> <div class="line"></div> <h4>PAGAMENTO</h4> <p><strong>Método:</strong> ${orderToPrint.payment_info.metodo}</p> <pre>${orderToPrint.payment_info.detalhes || ''}</pre> <br> <p class="center">Obrigado pela preferência!</p> </div> </body> </html> `; const printFrame = document.createElement('iframe'); printFrame.style.display = 'none'; document.body.appendChild(printFrame); printFrame.contentDocument.write(receiptHTML); printFrame.contentDocument.close(); printFrame.onload = function() { try { printFrame.contentWindow.focus(); printFrame.contentWindow.print(); } catch (e) { console.error("Erro ao tentar imprimir:", e); showNotification("Erro ao abrir janela de impressão.", "error"); } finally { setTimeout(() => { document.body.removeChild(printFrame); }, 1000); } }; }
    const formatCurrency = (value) => value != null ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    const findCategoryByProductId = (productId) => { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { return state.categories.find(c => c.name === product.category_name); } return null; };
    async function toggleProductAvailability(productId, isAvailable) { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { const updatedProduct = { ...product, available: isAvailable, category_id: product.category_id }; try { const response = await fetch(`http://localhost:3000/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) }); if (!response.ok) throw new Error('Falha ao atualizar disponibilidade.'); product.available = isAvailable; showNotification(`Disponibilidade atualizada.`, 'success'); } catch (error) { console.error('Erro ao atualizar disponibilidade:', error); showNotification(error.message, 'error'); const checkbox = document.querySelector(`.availability-toggle[data-product-id="${productId}"]`); if(checkbox) checkbox.checked = !isAvailable; } } }
    function showNotification(message, type = "success") { const area = document.getElementById('notification-area'); if(!area) return; const notification = document.createElement('div'); notification.className = `notification-message ${type}`; notification.textContent = message; area.appendChild(notification); setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); }, 3000); }
    const getStatusClass = (status) => status ? status.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
    function incrementAndGetDeliveryNumber() { const today = new Date().toISOString().split('T')[0]; if (state.lastCounterResetDate !== today) { state.deliveryCounter = 0; state.lastCounterResetDate = today; } state.deliveryCounter++; const formattedNumber = String(state.deliveryCounter).padStart(2, '0'); return `F${formattedNumber}`; }
    async function updateOrderStatus(orderId, newStatus) { /* (será implementado no futuro) */ }
    function unlockAudio() { if (isAudioUnlocked) return; notificationSound.play().catch(()=>{}); notificationSound.pause(); notificationSound.currentTime = 0; isAudioUnlocked = true; console.log('Contexto de áudio liberado pelo usuário.'); }
    
    const sidebarEl = document.getElementById('sidebar');
    const sidebarOverlayEl = document.getElementById('sidebar-overlay');
    function toggleSidebar() { sidebarEl.classList.toggle('visible'); sidebarOverlayEl.classList.toggle('active'); }
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlayEl.addEventListener('click', toggleSidebar);
    document.getElementById('logout-button').addEventListener('click', (e) => { e.preventDefault(); sessionStorage.removeItem('loggedInUser'); window.location.href = 'login.html'; });
    
    document.addEventListener('input', (e) => {
        if (e.target.id === 'category-search-input') {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.category-section').forEach(section => {
                const categoryName = section.dataset.categoryName || '';
                section.style.display = categoryName.includes(searchTerm) ? 'block' : 'none';
            });
        }
        if (e.target.id === 'product-image-url') { document.getElementById('image-preview').src = e.target.value || 'https://via.placeholder.com/150x150.png?text=...'; } 
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.print-button')) { const orderToPrint = state.orders.find(o => o.id == state.selectedOrderId); if(orderToPrint) { directPrint(orderToPrint); } return; }
        if (target.id === 'upload-image-button') { document.getElementById('product-image-file').click(); return; }
        const navLink = target.closest('.nav-link');
        if (navLink && !navLink.id.includes('logout')) { unlockAudio(); if (window.innerWidth <= 992 && sidebarEl.classList.contains('visible')) { toggleSidebar(); } if(!navLink.classList.contains('active')) { e.preventDefault(); document.querySelector('.nav-link.active')?.classList.remove('active'); navLink.classList.add('active'); renderView(navLink.dataset.view); } return; }
        if (state.currentView === 'pedidos') { const card = target.closest('.order-card'); const button = target.closest('.action-button'); const sectionHeader = target.closest('.section-header'); if (button) { e.stopPropagation(); updateOrderStatus(button.dataset.orderId, button.dataset.nextStatus); } else if (card) { state.selectedOrderId = card.dataset.orderId; const currentActive = document.querySelector('.order-card.active'); if (currentActive) { currentActive.classList.remove('active'); } card.classList.add('active'); renderOrderDetails(state.selectedOrderId); } else if (sectionHeader) { const status = sectionHeader.parentElement.dataset.status; if (state.collapsedSections.has(status)) { state.collapsedSections.delete(status); } else { state.collapsedSections.add(status); } renderPedidosView(); } return; }
        if (state.currentView === 'cardapio') {
            if (target.closest('.btn-edit-category')) { renameCategory(parseInt(target.closest('.btn-edit-category').dataset.categoryId)); return; }
            if (target.closest('.btn-toggle-visibility')) { toggleCategoryVisibility(parseInt(target.closest('.btn-toggle-visibility').dataset.categoryId)); return; }
            if (target.closest('.btn-delete-category')) { deleteCategory(parseInt(target.closest('.btn-delete-category').dataset.categoryId), target.closest('.btn-delete-category').dataset.categoryName); return; }
            const optionsButton = target.closest('.options-button'); if (optionsButton) { const menu = optionsButton.nextElementSibling; const isVisible = menu.style.display === 'block'; document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none'); menu.style.display = isVisible ? 'none' : 'block'; return; }
            if (!target.closest('.product-options')) { document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none'); }
            if (target.closest('#add-new-product-btn')) { openProductModal(); return; }
            if (target.closest('#add-new-category-btn')) { createNewCategory(); return; }
            if (target.classList.contains('edit-product-btn')) { const productId = target.dataset.productId; const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) openProductModal(product); return;}
            if (target.classList.contains('delete-product-btn')) { openConfirmModal(target.dataset.productId); return;}
        }
        if (target.closest('#cancel-modal-button') || target.closest('#close-modal-button')) { closeProductModal(); return; }
        if (target.closest('#cancel-confirm-button')) { closeConfirmModal(); return; }
        if (target.closest('#confirm-delete-button')) { deleteProduct(document.getElementById('confirm-modal-overlay').dataset.productIdToDelete); return; }
    });
    
    document.addEventListener('change', (e) => { 
        if (e.target.classList.contains('availability-toggle')) { toggleProductAvailability(e.target.dataset.productId, e.target.checked); } 
        if (e.target.id === 'theme-toggle') { applyTheme(e.target.checked ? 'dark' : 'light'); } 
        if (e.target.id === 'product-image-file' && e.target.files && e.target.files[0]) { const reader = new FileReader(); reader.onload = function(event) { document.getElementById('image-preview').src = event.target.result; }; reader.readAsDataURL(e.target.files[0]); } 
    });
    
    document.addEventListener('submit', (e) => { if(e.target.id === 'product-form') saveProduct(e); });
    
    async function init() {
        loadData();
        loadTheme();
        await fetchCategoriesAndProducts();
        renderView('dashboard');
    }

    init();
});