document.addEventListener('DOMContentLoaded', () => {

    // --- PROTEÇÃO DE TELA E BOAS-VINDAS ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return; 
    }
    const capitalizedUser = loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);
    document.getElementById('admin-user-name').textContent = `Olá, ${capitalizedUser}`;

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

    // --- DATA & THEME PERSISTENCE ---
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
    
    function renderDashboard() { const viewElement = document.getElementById('view-dashboard'); const ordersToday = state.orders; const revenueToday = ordersToday.reduce((sum, order) => sum + (order.total_value || 0), 0); viewElement.innerHTML = ` <div class="dashboard-grid"> <div class="stat-card"> <div class="stat-card-header"> <div class="icon faturamento-hoje"><ion-icon name="cash-outline"></ion-icon></div> <span>Faturamento Hoje</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueToday)}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon pedidos-hoje"><ion-icon name="receipt-outline"></ion-icon></div> <span>Pedidos Hoje</span> </div> <div class="stat-card-main-value">${ordersToday.length}</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon mes-atual"><ion-icon name="calendar-outline"></ion-icon></div> <span>Vendas Mês Atual</span> </div> <div class="stat-card-main-value">R$ 0,00</div> </div> <div class="stat-card"> <div class="stat-card-header"> <div class="icon mes-anterior"><ion-icon name="archive-outline"></ion-icon></div> <span>Vendas Mês Anterior</span> </div> <div class="stat-card-main-value">R$ 0,00</div> </div> </div>`; }
    function renderPedidosView() { const viewElement = document.getElementById('view-pedidos'); const statuses = ['Novo', 'Em Preparo', 'Prontos', 'Em Entrega', 'Finalizado']; const statusConfig = { 'Novo': { icon: 'sparkles-outline', title: 'Novos Pedidos' },'Em Preparo': { icon: 'flame-outline', title: 'Em Preparo' }, 'Prontos': { icon: 'checkmark-done-outline', title: 'Prontos (Retirada)' }, 'Em Entrega': { icon: 'bicycle-outline', title: 'Em Entrega' }, 'Finalizado': { icon: 'archive-outline', title: 'Finalizados' } }; viewElement.innerHTML = `<div class="pedidos-layout"><div class="pedidos-lista-vertical">${statuses.map(status => renderOrderStatusSection(status, statusConfig[status])).join('')}</div><div class="pedidos-detalhes-coluna" id="pedidos-detalhes-coluna"></div></div>`; renderOrderDetails(state.selectedOrderId); }
    function renderOrderStatusSection(status, config) { const ordersInSection = state.orders.filter(order => order.status === status); const isCollapsed = state.collapsedSections.has(status); return `<div class="status-section ${isCollapsed ? 'collapsed' : ''}" data-status="${status}"><div class="section-header"><ion-icon name="${config.icon}"></ion-icon><h3>${config.title}</h3><span class="count">${ordersInSection.length}</span><ion-icon name="chevron-down-outline" class="toggle-arrow"></ion-icon></div><div class="section-body">${ordersInSection.length > 0 ? ordersInSection.map(renderOrderCard).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 16px 0;">Nenhum pedido nesta etapa.</p>'}</div></div>`; }
    function renderOrderCard(order) { let actionButtonHTML = ''; if (order.status === 'Novo') { actionButtonHTML = `<button class="btn btn-primary action-button" data-order-id="${order.id}" data-next-status="Em Preparo"><ion-icon name="checkmark-outline"></ion-icon>Aceitar Pedido</button>`; } else if (order.status === 'Em Preparo') { actionButtonHTML = order.delivery_info.tipo === 'Entrega' ? `<button class="btn action-button dispatch" data-order-id="${order.id}" data-next-status="Em Entrega"><ion-icon name="bicycle-outline"></ion-icon>Despachar Pedido</button>` : `<button class="btn action-button ready" data-order-id="${order.id}" data-next-status="Prontos"><ion-icon name="checkmark-outline"></ion-icon>Pedido Pronto</button>`; } else if (order.status === 'Prontos' || order.status === 'Em Entrega') { actionButtonHTML = `<button class="btn action-button complete" data-order-id="${order.id}" data-next-status="Finalizado"><ion-icon name="archive-outline"></ion-icon>Finalizar</button>`; } let addressHTML = ''; if (order.delivery_info.tipo === 'Entrega') { const { rua, numero, bairro, complemento } = order.delivery_info; addressHTML = `<div class="order-card-address"><p><ion-icon name="location-outline"></ion-icon> <b>Rua:</b> ${rua}, ${numero}</p><p><b>Bairro:</b> ${bairro}</p>${complemento ? `<p><b>Comp:</b> ${complemento}</p>` : ''}</div>`; } const isNew = order.status === 'Novo'; return `<div class="order-card ${state.selectedOrderId == order.id ? 'active' : ''} ${isNew ? 'new-order' : ''}" data-order-id="${order.id}"><div class="order-card-header"><b>#${order.id}</b><span>${formatCurrency(order.total_value)}</span></div><p class="order-card-customer">${order.client_info.nome}</p>${addressHTML}<div class="order-card-info"><span><ion-icon name="time-outline"></ion-icon>${new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span><span><ion-icon name="${order.delivery_info.tipo === 'Entrega' ? 'bicycle-outline' : 'walk-outline'}"></ion-icon>${order.delivery_info.tipo}</span></div><div class="order-card-footer">${actionButtonHTML}</div></div>`; }
    function renderOrderDetails(orderId) { const detailsColumn = document.getElementById('pedidos-detalhes-coluna'); const order = state.orders.find(o => o.id == orderId); if (!order) { detailsColumn.innerHTML = `<div class="placeholder-detalhes"><ion-icon name="receipt-outline"></ion-icon><h3>Selecione um Pedido</h3><p>Clique em um card para ver os detalhes.</p></div>`; return; } const address = order.delivery_info.tipo === 'Retirada' ? '<p><b>Endereço:</b> Retirar no local</p>' : `<p><b>Endereço:</b> ${order.delivery_info.rua}, ${order.delivery_info.numero}</p><p><b>Bairro:</b> ${order.delivery_info.bairro}</p>${order.delivery_info.complemento ? `<p><b>Comp:</b> ${order.delivery_info.complemento}</p>` : ''}`; detailsColumn.innerHTML = ` <div class="details-content"> <div class="details-header"><h3>Pedido #${order.id}</h3><span class="status-tag ${getStatusClass(order.status)}">${order.status}</span></div> <div class="details-card-header"><ion-icon name="person-outline"></ion-icon>Cliente</div> <div class="details-card-body"><p><b>Nome:</b> ${order.client_info.nome}</p></div> <div class="details-card-header"><ion-icon name="location-outline"></ion-icon>Entrega</div> <div class="details-card-body"><p><b>Tipo:</b> ${order.delivery_info.tipo}</p>${address}</div> <div class="details-card-header"><ion-icon name="fast-food-outline"></ion-icon>Itens</div> <div class="details-card-body"> ${(order.items || []).map(item => `<div class="order-item-row"><span>${item.quantity || 1}x ${item.name || 'Item não encontrado'}</span><span>${formatCurrency(item.price * item.quantity)}</span></div>`).join('')} <div class="details-total-row"><span>Total</span><span>${formatCurrency(order.total_value)}</span></div> </div> <div class="details-card-header"><ion-icon name="wallet-outline"></ion-icon>Pagamento</div> <div class="details-card-body"><p><b>Método:</b> ${order.payment_info.metodo || 'Não informado'}</p>${order.payment_info.detalhes ? `<p><b>Detalhes:</b> ${order.payment_info.detalhes}</p>` : ''}</div> </div> <div class="details-footer"><button class="btn btn-primary print-button"><ion-icon name="print-outline"></ion-icon>Imprimir</button></div>`; }
    function renderCardapioView() { const viewElement = document.getElementById('view-cardapio'); const sortedCategories = [...state.categories]; let categoriesHTML = sortedCategories.map(category => { const productsInCategory = state.menu[category.name] || []; return ` <div class="category-section" data-category-name="${category.name.toLowerCase()}"> <h3 class="category-header"> <span>${category.name}</span> <div class="category-actions"> <button class="btn-category-action btn-edit-category" data-category-id="${category.id}" title="Renomear Categoria"> <ion-icon name="pencil-outline"></ion-icon> </button> <button class="btn-category-action btn-toggle-visibility ${!category.is_visible ? 'invisible' : ''}" data-category-id="${category.id}" title="${category.is_visible ? 'Tornar Invisível' : 'Tornar Visível'}"> <ion-icon name="${category.is_visible ? 'eye-outline' : 'eye-off-outline'}"></ion-icon> </button> <button class="btn-category-action btn-delete-category" data-category-id="${category.id}" data-category-name="${category.name}" title="Excluir Categoria"> <ion-icon name="trash-outline"></ion-icon> </button> </div> </h3> <div class="product-grid"> ${productsInCategory.map(createProductCardHTML).join('')} </div> </div>`; }).join(''); viewElement.innerHTML = ` <div class="view-header"> <div><h2>Cardápio</h2><p>Gerencie os produtos e categorias.</p></div> <div class="category-search-container"> <ion-icon name="search-outline"></ion-icon> <input type="search" id="category-search-input" placeholder="Pesquisar Categoria..."> </div> <div class="view-header-actions"> <button class="btn btn-secondary" id="add-new-category-btn"><ion-icon name="add-outline"></ion-icon>Nova Categoria</button> <button class="btn btn-primary" id="add-new-product-btn"><ion-icon name="add-outline"></ion-icon>Adicionar Produto</button> </div> </div> <div class="cardapio-grid">${categoriesHTML}</div>`; }
    function createProductCardHTML(product) { return `<div class="product-card" data-product-id="${product.id}"><div class="product-options"><button class="options-button"><ion-icon name="ellipsis-vertical"></ion-icon></button><div class="options-menu"><button class="edit-product-btn" data-product-id="${product.id}">Editar</button><button class="delete-product-btn delete-btn" data-product-id="${product.id}">Excluir</button></div></div><img src="${product.image || 'assets/placeholder.png'}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x160.png?text=Sem+Imagem';"><div class="product-info"><h4>${product.name}</h4><p class="price">${formatCurrency(product.price)}</p><p class="description">${product.description || 'Sem descrição.'}</p></div><div class="product-actions"><div class="product-availability-switch"><span>Disponível</span><label class="switch"><input type="checkbox" class="availability-toggle" data-product-id="${product.id}" ${product.available ? 'checked' : ''}><span class="slider"></span></label></div></div></div>`; }
    function renderRelatoriosView() { /* ... (código existente) ... */ }
    function renderConfiguracoesView() { /* ... (código existente) ... */ }
    function openProductModal(productData = null) { /* ... (código existente) ... */ }
    async function saveProduct(e) { /* ... (código existente) ... */ }
    function closeProductModal() { document.getElementById('product-modal-overlay').classList.remove('visible'); }
    function openConfirmModal(productId) { const modal = document.getElementById('confirm-modal-overlay'); modal.dataset.productIdToDelete = productId; modal.classList.add('visible'); }
    function closeConfirmModal() { document.getElementById('confirm-modal-overlay').classList.remove('visible'); }
    async function deleteProduct(productId) { /* ... (código existente) ... */ }
    async function renameCategory(categoryId) { /* ... (código existente) ... */ }
    async function toggleCategoryVisibility(categoryId) { /* ... (código existente) ... */ }
    async function createNewCategory() { /* ... (código existente) ... */ }
    async function deleteCategory(categoryId, categoryName) { /* ... (código existente) ... */ }

    // --- LÓGICA DE IMPRESSÃO (NOVO E SIMPLIFICADO) ---
    function directPrint(orderToPrint) {
        if (!orderToPrint) {
            showNotification("Pedido não encontrado para impressão.", "error");
            return;
        }

        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

        // Monta a string de itens
        const itemsText = (orderToPrint.items || []).map(item => {
            const itemTotal = formatCurrency(item.price * item.quantity);
            let line = `${item.quantity}x ${item.name}`.padEnd(28) + `${itemTotal}\n`;
            if (item.adicionais && item.adicionais.length > 0) {
                line += item.adicionais.map(ad => `  + ${ad.nome}`).join('\n') + '\n';
            }
            if (item.observacao) {
                line += `  Obs: ${item.observacao}\n`;
            }
            return line;
        }).join('');

        // Monta a string de endereço
        let deliveryText = `Tipo: ${orderToPrint.delivery_info.tipo}\n`;
        if (orderToPrint.delivery_info.tipo === 'Entrega') {
            deliveryText += `End: ${orderToPrint.delivery_info.rua}, ${orderToPrint.delivery_info.numero}\n`;
            deliveryText += `Bairro: ${orderToPrint.delivery_info.bairro}\n`;
            if (orderToPrint.delivery_info.complemento) {
                deliveryText += `Comp: ${orderToPrint.delivery_info.complemento}\n`;
            }
        }

        // Monta a string de pagamento
        let paymentText = `Metodo: ${orderToPrint.payment_info.metodo}\n`;
        if (orderToPrint.payment_info.detalhes) {
            paymentText += `Obs: ${orderToPrint.payment_info.detalhes}\n`;
        }

        const receiptContent = `
            <div style="font-family: monospace; font-size: 12px; width: 72mm;">
                <h3 style="text-align: center;">Zap Esfirras</h3>
                ${orderToPrint.delivery_number ? `<h2 style="text-align: center;">${orderToPrint.delivery_number}</h2>` : ''}
                <p style="text-align: center;">
                    Rua Gabriel Pinheiro, 75 - Centro<br>
                    Tel: (19) 99143-2597
                </p>
                <p>----------------------------------------</p>
                <p><strong>PEDIDO #${orderToPrint.id}</strong></p>
                <p>${formattedDate}</p>
                <p>----------------------------------------</p>
                <p><strong>Cliente:</strong> ${orderToPrint.client_info.nome}</p>
                <p>----------------------------------------</p>
                <p><strong>ENTREGA / RETIRADA</strong></p>
                <pre>${deliveryText}</pre>
                <p>----------------------------------------</p>
                <p><strong>ITENS DO PEDIDO</strong></p>
                <pre>Qtd Item                      Total</pre>
                <pre>${itemsText}</pre>
                <p>----------------------------------------</p>
                <div style="text-align: right;">
                    <p><strong>SUBTOTAL: ${formatCurrency(orderToPrint.total_value - (orderToPrint.delivery_info.tipo === 'Entrega' ? 5 : 0))}</strong></p>
                    <p><strong>TAXA ENTREGA: ${formatCurrency(orderToPrint.delivery_info.tipo === 'Entrega' ? 5 : 0)}</strong></p>
                    <p><strong>TOTAL: ${formatCurrency(orderToPrint.total_value)}</strong></p>
                </div>
                <p>----------------------------------------</p>
                <p><strong>PAGAMENTO</strong></p>
                <pre>${paymentText}</pre>
                <p style="text-align: center; margin-top: 10px;">Obrigado pela preferência!</p>
            </div>
        `;

        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
        printFrame.contentDocument.write(receiptContent);
        printFrame.contentDocument.close();
        printFrame.onload = function() {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (e) {
                console.error("Erro ao tentar imprimir:", e);
                showNotification("Erro ao abrir janela de impressão.", "error");
            } finally {
                setTimeout(() => {
                    document.body.removeChild(printFrame);
                }, 1000);
            }
        };
    }
    
    // --- FUNÇÕES UTILITÁRIAS ---
    const formatCurrency = (value) => value != null ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    const findCategoryByProductId = (productId) => { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { return state.categories.find(c => c.name === product.category_name); } return null; };
    async function toggleProductAvailability(productId, isAvailable) { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { const updatedProduct = { ...product, available: isAvailable, category_id: product.category_id }; try { const response = await fetch(`http://localhost:3000/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) }); if (!response.ok) throw new Error('Falha ao atualizar disponibilidade.'); product.available = isAvailable; showNotification(`Disponibilidade atualizada.`, 'success'); } catch (error) { console.error('Erro ao atualizar disponibilidade:', error); showNotification(error.message, 'error'); const checkbox = document.querySelector(`.availability-toggle[data-product-id="${productId}"]`); if(checkbox) checkbox.checked = !isAvailable; } } }
    function showNotification(message, type = "success") { const area = document.getElementById('notification-area'), notification = document.createElement('div'); notification.className = `notification-message ${type}`; notification.textContent = message; area.appendChild(notification); setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); }, 3000); }
    const getStatusClass = (status) => status ? status.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
    function incrementAndGetDeliveryNumber() { const today = new Date().toISOString().split('T')[0]; if (state.lastCounterResetDate !== today) { state.deliveryCounter = 0; state.lastCounterResetDate = today; } state.deliveryCounter++; const formattedNumber = String(state.deliveryCounter).padStart(2, '0'); return `F${formattedNumber}`; }
    async function updateOrderStatus(orderId, newStatus) { const order = state.orders.find(o => o.id == orderId); if (order) { const oldStatus = order.status; let deliveryNumber = order.delivery_number; if (order.delivery_info.tipo === 'Entrega' && oldStatus === 'Novo' && newStatus === 'Em Preparo') { if (!deliveryNumber) { deliveryNumber = await incrementAndGetDeliveryNumber(); } } try { const response = await fetch(`http://localhost:3000/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus, deliveryNumber: deliveryNumber }) }); if (!response.ok) throw new Error('Falha ao atualizar o status do pedido.'); order.status = newStatus; if (deliveryNumber) order.delivery_number = deliveryNumber; showNotification(`Pedido #${orderId} atualizado para ${newStatus}.`, 'success'); renderPedidosView(); if (oldStatus === 'Novo' && newStatus === 'Em Preparo') { setTimeout(() => { directPrint(order); }, 100); } } catch(error) { showNotification(error.message, 'error'); } } }
    function unlockAudio() { if (isAudioUnlocked) return; notificationSound.play().catch(()=>{}); notificationSound.pause(); notificationSound.currentTime = 0; isAudioUnlocked = true; console.log('Contexto de áudio liberado pelo usuário.'); }
    
    // --- EVENT LISTENERS ---
    const sidebarEl = document.getElementById('sidebar');
    const sidebarOverlayEl = document.getElementById('sidebar-overlay');
    function toggleSidebar() { sidebarEl.classList.toggle('visible'); sidebarOverlayEl.classList.toggle('active'); }
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
    
    // --- INITIALIZATION ---
    async function init() {
        loadData();
        loadTheme();
        await fetchCategoriesAndProducts();
        renderView('dashboard');
    }

    init();
});