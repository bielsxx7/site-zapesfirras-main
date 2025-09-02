document.addEventListener('DOMContentLoaded', () => {

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return; 
    }
    const capitalizedUser = loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);
    document.getElementById('admin-user-name').textContent = `Olá, ${capitalizedUser}`;

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

    const pageTitle = document.getElementById('page-title');
    const notificationSound = document.getElementById('notification-sound');
    const menuToggle = document.getElementById('menu-toggle');
    let isAudioUnlocked = false;

    function loadData() { 
        const savedState = JSON.parse(localStorage.getItem('zapEsfirrasAdminState')); 
        if (savedState) { 
            state.orders = savedState.orders || []; 
            state.deliveryCounter = savedState.deliveryCounter || 0;
            state.lastCounterResetDate = savedState.lastCounterResetDate || null;
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
    
    function renderDashboard() { const viewElement = document.getElementById('view-dashboard'); const today = new Date().toISOString().split('T')[0]; const ordersToday = state.orders.filter(o => o.date === today); const revenueToday = ordersToday.reduce((sum, order) => sum + (order.valor || 0), 0); const revenueThisMonth = 0; const revenueLastMonth = 0; viewElement.innerHTML = ` <div class="dashboard-grid"> <div class="stat-card"> <div class="stat-card-header"> <div class="icon faturamento-hoje"><ion-icon name="cash-outline"></ion-icon></div> <span>Faturamento Hoje</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueToday)}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon pedidos-hoje"><ion-icon name="receipt-outline"></ion-icon></div> <span>Pedidos Hoje</span> </div> <div class="stat-card-main-value">${ordersToday.length}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon mes-atual"><ion-icon name="calendar-outline"></ion-icon></div> <span>Vendas Mês Atual</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueThisMonth)}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon mes-anterior"><ion-icon name="archive-outline"></ion-icon></div> <span>Vendas Mês Anterior</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueLastMonth)}</div> </div> </div>`; }
    function renderPedidosView() { const viewElement = document.getElementById('view-pedidos'); const statuses = ['Novo', 'Em Preparo', 'Prontos', 'Em Entrega', 'Finalizado']; const statusConfig = { 'Novo': { icon: 'sparkles-outline', title: 'Novos Pedidos' },'Em Preparo': { icon: 'flame-outline', title: 'Em Preparo' }, 'Prontos': { icon: 'checkmark-done-outline', title: 'Prontos (Retirada)' }, 'Em Entrega': { icon: 'bicycle-outline', title: 'Em Entrega' }, 'Finalizado': { icon: 'archive-outline', title: 'Finalizados' } }; viewElement.innerHTML = `<div class="pedidos-layout"><div class="pedidos-lista-vertical">${statuses.map(status => renderOrderStatusSection(status, statusConfig[status])).join('')}</div><div class="pedidos-detalhes-coluna" id="pedidos-detalhes-coluna"></div></div>`; renderOrderDetails(state.selectedOrderId); }
    function renderOrderStatusSection(status, config) { const ordersInSection = state.orders.filter(order => order.status === status); const isCollapsed = state.collapsedSections.has(status); return `<div class="status-section ${isCollapsed ? 'collapsed' : ''}" data-status="${status}"><div class="section-header"><ion-icon name="${config.icon}"></ion-icon><h3>${config.title}</h3><span class="count">${ordersInSection.length}</span><ion-icon name="chevron-down-outline" class="toggle-arrow"></ion-icon></div><div class="section-body">${ordersInSection.length > 0 ? ordersInSection.map(renderOrderCard).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 16px 0;">Nenhum pedido nesta etapa.</p>'}</div></div>`; }
    function renderOrderCard(order) { let actionButtonHTML = ''; if (order.status === 'Novo') { actionButtonHTML = `<button class="btn btn-primary action-button" data-order-id="${order.id}" data-next-status="Em Preparo"><ion-icon name="checkmark-outline"></ion-icon>Aceitar Pedido</button>`; } else if (order.status === 'Em Preparo') { actionButtonHTML = order.tipo === 'Entrega' ? `<button class="btn action-button dispatch" data-order-id="${order.id}" data-next-status="Em Entrega"><ion-icon name="bicycle-outline"></ion-icon>Despachar Pedido</button>` : `<button class="btn action-button ready" data-order-id="${order.id}" data-next-status="Prontos"><ion-icon name="checkmark-outline"></ion-icon>Pedido Pronto</button>`; } else if (order.status === 'Prontos' || order.status === 'Em Entrega') { actionButtonHTML = `<button class="btn action-button complete" data-order-id="${order.id}" data-next-status="Finalizado"><ion-icon name="archive-outline"></ion-icon>Finalizar</button>`; } let addressHTML = ''; if (order.tipo === 'Entrega' && order.entrega.rua !== 'Retirar no local') { const { rua, numero, bairro, complemento } = order.entrega; addressHTML = `<div class="order-card-address"><p><ion-icon name="location-outline"></ion-icon> <b>Rua:</b> ${rua}, ${numero}</p><p><b>Bairro:</b> ${bairro}</p>${complemento ? `<p><b>Comp:</b> ${complemento}</p>` : ''}</div>`; } const isNew = order.status === 'Novo'; return `<div class="order-card ${state.selectedOrderId == order.id ? 'active' : ''} ${isNew ? 'new-order' : ''}" data-order-id="${order.id}"><div class="order-card-header"><b>#${order.id}</b><span>${formatCurrency(order.valor)}</span></div><p class="order-card-customer">${order.cliente.nome}</p>${addressHTML}<div class="order-card-info"><span><ion-icon name="time-outline"></ion-icon>${order.horario}</span><span><ion-icon name="${order.tipo === 'Entrega' ? 'bicycle-outline' : 'walk-outline'}"></ion-icon>${order.tipo}</span></div><div class="order-card-footer">${actionButtonHTML}</div></div>`; }
    function renderOrderDetails(orderId) { const detailsColumn = document.getElementById('pedidos-detalhes-coluna'); const order = state.orders.find(o => o.id == orderId); if (!order) { detailsColumn.innerHTML = `<div class="placeholder-detalhes"><ion-icon name="receipt-outline"></ion-icon><h3>Selecione um Pedido</h3><p>Clique em um card para ver os detalhes.</p></div>`; return; } const address = order.entrega.rua === 'Retirar no local' ? '<p><b>Endereço:</b> Retirar no local</p>' : `<p><b>Endereço:</b> ${order.entrega.rua}, ${order.entrega.numero}</p><p><b>Bairro:</b> ${order.entrega.bairro}</p>${order.entrega.complemento ? `<p><b>Comp:</b> ${order.entrega.complemento}</p>` : ''}`; detailsColumn.innerHTML = ` <div class="details-content"> <div class="details-header"><h3>Pedido #${order.id}</h3><span class="status-tag ${getStatusClass(order.status)}">${order.status}</span></div> <div class="details-card-header"><ion-icon name="person-outline"></ion-icon>Cliente</div> <div class="details-card-body"><p><b>Nome:</b> ${order.cliente.nome}</p></div> <div class="details-card-header"><ion-icon name="location-outline"></ion-icon>Entrega</div> <div class="details-card-body"><p><b>Tipo:</b> ${order.tipo}</p>${address}</div> <div class="details-card-header"><ion-icon name="fast-food-outline"></ion-icon>Itens</div> <div class="details-card-body"> ${(order.itens || []).map(item => `<div class="order-item-row"><span>${item.quantity || 1}x ${item.name || 'Item não encontrado'}</span><span>${formatCurrency(item.total || 0)}</span></div>`).join('')} <div class="details-total-row"><span>Total</span><span>${formatCurrency(order.valor)}</span></div> </div> <div class="details-card-header"><ion-icon name="wallet-outline"></ion-icon>Pagamento</div> <div class="details-card-body"><p><b>Método:</b> ${order.pagamento.metodo || 'Não informado'}</p>${order.pagamento.detalhes ? `<p><b>Detalhes:</b> ${order.pagamento.detalhes}</p>` : ''}</div> </div> <div class="details-footer"><button class="btn btn-primary print-button"><ion-icon name="print-outline"></ion-icon>Imprimir</button></div>`; }
    function renderCardapioView() { const viewElement = document.getElementById('view-cardapio'); const sortedCategories = [...state.categories]; let categoriesHTML = sortedCategories.map(category => { const productsInCategory = state.menu[category.name] || []; return ` <div class="category-section" data-category-name="${category.name.toLowerCase()}"> <h3 class="category-header"> <span>${category.name}</span> <div class="category-actions"> <button class="btn-category-action btn-edit-category" data-category-id="${category.id}" title="Renomear Categoria"> <ion-icon name="pencil-outline"></ion-icon> </button> <button class="btn-category-action btn-toggle-visibility ${!category.is_visible ? 'invisible' : ''}" data-category-id="${category.id}" title="${category.is_visible ? 'Tornar Invisível' : 'Tornar Visível'}"> <ion-icon name="${category.is_visible ? 'eye-outline' : 'eye-off-outline'}"></ion-icon> </button> <button class="btn-category-action btn-delete-category" data-category-id="${category.id}" data-category-name="${category.name}" title="Excluir Categoria"> <ion-icon name="trash-outline"></ion-icon> </button> </div> </h3> <div class="product-grid"> ${productsInCategory.map(createProductCardHTML).join('')} </div> </div>`; }).join(''); viewElement.innerHTML = ` <div class="view-header"> <div><h2>Cardápio</h2><p>Gerencie os produtos e categorias.</p></div> <div class="category-search-container"> <ion-icon name="search-outline"></ion-icon> <input type="search" id="category-search-input" placeholder="Pesquisar Categoria..."> </div> <div class="view-header-actions"> <button class="btn btn-secondary" id="add-new-category-btn"><ion-icon name="add-outline"></ion-icon>Nova Categoria</button> <button class="btn btn-primary" id="add-new-product-btn"><ion-icon name="add-outline"></ion-icon>Adicionar Produto</button> </div> </div> <div class="cardapio-grid">${categoriesHTML}</div>`; }
    function createProductCardHTML(product) { return `<div class="product-card" data-product-id="${product.id}"><div class="product-options"><button class="options-button"><ion-icon name="ellipsis-vertical"></ion-icon></button><div class="options-menu"><button class="edit-product-btn" data-product-id="${product.id}">Editar</button><button class="delete-product-btn delete-btn" data-product-id="${product.id}">Excluir</button></div></div><img src="${product.image || 'assets/placeholder.png'}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x160.png?text=Sem+Imagem';"><div class="product-info"><h4>${product.name}</h4><p class="price">${formatCurrency(product.price)}</p><p class="description">${product.description || 'Sem descrição.'}</p></div><div class="product-actions"><div class="product-availability-switch"><span>Disponível</span><label class="switch"><input type="checkbox" class="availability-toggle" data-product-id="${product.id}" ${product.available ? 'checked' : ''}><span class="slider"></span></label></div></div></div>`; }
    function renderRelatoriosView() { const viewElement = document.getElementById('view-relatorios'); const salesByProduct = (state.orders || []).flatMap(o => o.itens || []).reduce((acc, item) => { const itemName = item.name || item.nome || 'Item desconhecido'; if (!acc[itemName]) { acc[itemName] = { quantity: 0, total: 0 }; } acc[itemName].quantity += (item.quantity || 1); acc[itemName].total += (item.total || item.valor || 0); return acc; }, {}); viewElement.innerHTML = `<div class="view-header"><h2>Relatórios</h2><p>Analise o desempenho de suas vendas.</p></div><div class="report-container"><div class="report-filters"><div class="form-group"><label for="report-type">Tipo de Relatório</label><select id="report-type"><option>Vendas por Produto</option></select></div><div class="form-group"><label for="date-range">Período</label><input type="text" id="date-range" value="Últimos 30 dias"></div><button class="btn btn-primary">Gerar</button></div><div class="report-table-container"><table class="report-table"><thead><tr><th>Produto</th><th>Itens Vendidos</th><th>Receita Bruta</th></tr></thead><tbody>${Object.entries(salesByProduct).map(([name, data]) => `<tr><td>${name}</td><td>${data.quantity}</td><td>${formatCurrency(data.total)}</td></tr>`).join('')}</tbody></table></div></div>`; }
    function renderConfiguracoesView() { const viewElement = document.getElementById('view-configuracoes'); viewElement.innerHTML = `<div class="view-header"><h2>Configurações</h2><p>Ajustes gerais do painel e da loja.</p></div><div class="settings-grid"><div class="settings-card"><h3>Aparência</h3><div class="setting-item"><label for="theme-toggle">Modo Escuro</label><label class="switch"><input type="checkbox" id="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}><span class="slider"></span></label></div></div><div class="settings-card"><h3>Loja (Em breve)</h3><p>Aqui você poderá editar informações como nome, endereço e horário de funcionamento.</p></div></div>`; }
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
    function directPrint(orderToPrint) { if (!orderToPrint) { showNotification("Selecione um pedido para imprimir.", "error"); return; } showNotification("Preparando para imprimir...", "success"); const now = new Date(); const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`; const itemsHTML = (orderToPrint.itens || []).map(item => { const itemName = item.name || item.nome || 'Item desconhecido'; const itemQty = item.quantity || 1; const itemTotal = item.total || item.valor || 0; return `<tr><td>${itemQty}x</td><td>${itemName}</td><td>${formatCurrency(itemTotal)}</td></tr>`; }).join(''); const receiptStyle = `<style>body{font-family:'Courier New',monospace;font-size:14px;line-height:1.5;color:#000;margin:0;padding:0;font-weight:bold;}.receipt-container{width:302px;padding:15px}.receipt-header{text-align:center;margin-bottom:15px}.receipt-header img{max-width:80px;margin-bottom:10px}.receipt-header h3{font-size:18px;margin:0;font-weight:bold;}.receipt-delivery-number{font-size:24px;font-weight:bold;margin:10px 0}.receipt-section{border-top:1px dashed #000;padding-top:10px;margin-top:10px}.receipt-section h4{text-align:center;font-size:16px;margin:0 0 10px 0;font-weight:bold;}.receipt-section p{margin:0 0 3px 0;}.receipt-items-table{width:100%;margin-top:10px}.receipt-items-table th,.receipt-items-table td{text-align:left;padding:3px 0;font-weight:bold;}.receipt-items-table th:last-child,.receipt-items-table td:last-child{text-align:right}.receipt-items-table thead{border-bottom:1px dashed #000}.receipt-total{text-align:right;margin-top:15px}.receipt-total p{font-size:16px;font-weight:bold;margin:0}.receipt-footer{text-align:center;margin-top:20px;font-size:12px;}@page{margin:5mm}</style>`; const receiptHTML = `<div class="receipt-container"><div class="receipt-header"> <img src="/assets/zapesfiiras.png" alt="Logo"> <h3>Zap Esfirras</h3> ${orderToPrint.deliveryNumber ? `<p class="receipt-delivery-number">${orderToPrint.deliveryNumber}</p>` : ''} <p>Rua Gabriel Pinheiro, 75 - Centro</p> <p>Tel: (19) 99143-2597</p> <p>--------------------------------</p> <p><strong>PEDIDO #${orderToPrint.id}</strong></p> <p>${formattedDate}</p> </div><div class="receipt-section"><h4>Cliente</h4><p><strong>Nome:</strong> ${orderToPrint.cliente.nome}</p>${orderToPrint.cliente.telefone ? `<p><strong>Tel:</strong> ${orderToPrint.cliente.telefone}</p>` : ''}</div><div class="receipt-section"><h4>Entrega / Retirada</h4><p><strong>Tipo:</strong> ${orderToPrint.tipo}</p>${orderToPrint.tipo === 'Entrega' ? `<p><strong>End:</strong> ${orderToPrint.entrega.rua}, ${orderToPrint.entrega.numero}</p><p><strong>Bairro:</strong> ${orderToPrint.entrega.bairro}</p>${orderToPrint.entrega.complemento ? `<p><strong>Comp:</strong> ${orderToPrint.entrega.complemento}</p>` : ''}` : ''}</div><div class="receipt-section"><h4>Itens do Pedido</h4><table class="receipt-items-table"><thead><tr><th>Qtd</th><th>Item</th><th>Total</th></tr></thead><tbody>${itemsHTML}</tbody></table></div><div class="receipt-section receipt-total"><p>SUBTOTAL: ${formatCurrency(orderToPrint.valor)}</p><p><strong>TOTAL: ${formatCurrency(orderToPrint.valor)}</strong></p></div><div class="receipt-section"><h4>Pagamento</h4><p><strong>Método:</strong> ${orderToPrint.pagamento.metodo}</p>${orderToPrint.pagamento.detalhes ? `<p><strong>Obs:</strong> ${orderToPrint.pagamento.detalhes}</p>` : ''}</div><div class="receipt-footer"><p>Obrigado pela preferência!</p></div></div>`; const printFrame = document.createElement('iframe'); printFrame.style.display = 'none'; document.body.appendChild(printFrame); printFrame.contentDocument.write(`<html><head>${receiptStyle}</head><body>${receiptHTML}</body></html>`); printFrame.contentDocument.close(); printFrame.onload = function() { printFrame.contentWindow.focus(); printFrame.contentWindow.print(); document.body.removeChild(printFrame); }; }
    const formatCurrency = (value) => value != null ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    const findCategoryByProductId = (productId) => { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { return state.categories.find(c => c.name === product.category_name); } return null; };
    async function toggleProductAvailability(productId, isAvailable) { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { const updatedProduct = { ...product, available: isAvailable, category_id: product.category_id }; try { const response = await fetch(`http://localhost:3000/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) }); if (!response.ok) throw new Error('Falha ao atualizar disponibilidade.'); product.available = isAvailable; showNotification(`Disponibilidade atualizada.`, 'success'); } catch (error) { console.error('Erro ao atualizar disponibilidade:', error); showNotification(error.message, 'error'); const checkbox = document.querySelector(`.availability-toggle[data-product-id="${productId}"]`); if(checkbox) checkbox.checked = !isAvailable; } } }
    function showNotification(message, type = "success") { const area = document.getElementById('notification-area'), notification = document.createElement('div'); notification.className = `notification-message ${type}`; notification.textContent = message; area.appendChild(notification); setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); }, 3000); }
    const getStatusClass = (status) => status ? status.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
    function incrementAndGetDeliveryNumber() { const today = new Date().toISOString().split('T')[0]; if (state.lastCounterResetDate !== today) { state.deliveryCounter = 0; state.lastCounterResetDate = today; } state.deliveryCounter++; const formattedNumber = String(state.deliveryCounter).padStart(2, '0'); return `F${formattedNumber}`; }
    function updateOrderStatus(orderId, newStatus) { const order = state.orders.find(o => o.id == orderId); if (order) { const oldStatus = order.status; if (order.tipo === 'Entrega' && oldStatus === 'Novo' && newStatus === 'Em Preparo') { if (!order.deliveryNumber) { order.deliveryNumber = incrementAndGetDeliveryNumber(); } } order.status = newStatus; saveData(); renderPedidosView(); if (oldStatus === 'Novo' && newStatus === 'Em Preparo') { setTimeout(() => { directPrint(order); }, 100); } } }
    function simulateNewOrder() { const newId = (state.orders.length > 0 ? Math.max(...state.orders.map(o => o.id)) : 10001) + 1; const newOrder = { id: newId, date: new Date().toISOString().split('T')[0], cliente: { nome: "Cliente Simulado", telefone: "19 00000-0000" }, horario: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}), valor: 42.50, tipo: "Entrega", status: "Novo", entrega: { rua: "Rua Fictícia", numero: "S/N", bairro: "Bairro Demo", complemento: "" }, pagamento: { metodo: "Pix", detalhes: "Pagamento online" }, itens: [{ name: "Esfirra de Queijo", quantity: 5, total: 25.00 }, {name: "Guaraná Lata", quantity: 2, total: 17.50}] }; state.orders.unshift(newOrder); saveData(); showNotification(`Novo pedido #${newId} recebido!`, 'success'); notificationSound.play().catch(e => console.log("Autoplay de áudio bloqueado.")); if(state.currentView === 'pedidos' || state.currentView === 'dashboard') { renderView(state.currentView); } }
    // setInterval(simulateNewOrder, 30000);
    function unlockAudio() { if (isAudioUnlocked) return; notificationSound.play().catch(()=>{}); notificationSound.pause(); notificationSound.currentTime = 0; isAudioUnlocked = true; console.log('Contexto de áudio liberado pelo usuário.'); }
    
    // --- EVENT LISTENERS ---
    const sidebarEl = document.getElementById('sidebar');
    const sidebarOverlayEl = document.getElementById('sidebar-overlay');
    
    function toggleSidebar() { 
        sidebarEl.classList.toggle('visible'); 
        sidebarOverlayEl.classList.toggle('active');
    }

    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlayEl.addEventListener('click', toggleSidebar);
    document.getElementById('logout-button').addEventListener('click', (e) => { e.preventDefault(); sessionStorage.removeItem('loggedInUser'); window.location.href = 'login.html'; });
    
    document.addEventListener('input', (e) => {
        if (e.target.id === 'category-search-input') {
            const searchTerm = e.target.value.toLowerCase();
            const categorySections = document.querySelectorAll('.category-section');
            categorySections.forEach(section => {
                const categoryName = section.dataset.categoryName || '';
                if (categoryName.includes(searchTerm)) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
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