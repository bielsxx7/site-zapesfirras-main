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
        currentView: 'dashboard',
        selectedOrderId: null,
        collapsedSections: new Set(['Finalizado']),
        theme: 'light'
    };

    // --- ELEMENT SELECTORS ---
    const pageTitle = document.getElementById('page-title');
    const notificationSound = document.getElementById('notification-sound');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const logoutButton = document.getElementById('logout-button');

    // --- MOCK DATA (COM PEDIDOS NOVOS PARA TESTE) ---
    const initialMockOrders = [
        { id: 10001, date: new Date().toISOString().split('T')[0], cliente: { nome: "CLIENTE TESTE NOVO", telefone: "19 00000-1111" }, horario: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}), valor: 16.00, tipo: "Entrega", status: "Novo", entrega: { rua: "Rua Nova", numero: "1", bairro: "Bairro Novo", complemento: "" }, pagamento: { metodo: "Dinheiro", detalhes: "Troco para R$ 20,00" }, itens: [{ name: "Esfirra de Queijo", quantity: 2, total: 10.00 }, {name: "Coca-Cola Lata", quantity: 1, total: 6.00}] },
        { id: 4860, date: new Date().toISOString().split('T')[0], cliente: { nome: "Cliente Antigo", telefone: "19 12345-6789" }, horario: "13:20", valor: 30.00, tipo: "Entrega", status: "Novo", entrega: { rua: "Rua da Simulação", numero: "100", bairro: "Vila Teste", complemento: "" }, pagamento: { metodo: "Pix", detalhes: "Pagamento online" }, itens: [{ name: "Esfirra de Carne", quantity: 4, total: 22.00 }, {name: "Guaraná Lata", quantity: 1, total: 8.00}] },
        { id: 4859, date: new Date().toISOString().split('T')[0], cliente: { nome: "Fernanda Lima", telefone: "19 99111-2222" }, horario: "11:30", valor: 45.00, tipo: "Entrega", status: "Em Preparo", entrega: { rua: "Rua das Palmeiras", numero: "789", bairro: "Jardim das Rosas", complemento: "Casa" }, pagamento: { metodo: "Pix", detalhes: "Pagamento online" }, itens: [{ name: "Esfirra de Carne", quantity: 5, total: 27.50 }, {name: "Esfirra de Queijo", quantity: 2, total: 10.00}, {name: "Coca-Cola Lata", quantity: 1, total: 7.50 }] },
        { id: 4858, date: new Date().toISOString().split('T')[0], cliente: { nome: "Roberto Carlos", telefone: "19 99333-4444" }, horario: "11:25", valor: 18.50, tipo: "Retirada", status: "Em Preparo", entrega: { rua: "Retirar no local" }, pagamento: { metodo: "Cartão de Débito", detalhes: "Pagamento na entrega"}, itens: [{ name: "Esfirra de Queijo", quantity: 2, total: 10.00 }, { name: "Guaraná Lata", quantity: 1, total: 8.50 }] },
        { id: 4857, date: "2025-08-30", cliente: { nome: "Carlos Alberto", telefone: "19 99876-5432" }, horario: "11:15", valor: 35.00, tipo: "Entrega", status: "Finalizado", entrega: { rua: "Rua das Flores", numero: "123", bairro: "Centro", complemento: "Apto 10" }, pagamento: { metodo: "Cartão de Crédito", detalhes: "Pagamento na entrega" }, itens: [{ name: "Esfirra de Carne", quantity: 5, total: 27.50 }, { name: "Guaraná Lata", quantity: 1, total: 7.50 }] },
    ];
    const initialMockMenu = {
        "Esfirras Salgadas": [
            { id: 1, name: "Esfirra de Carne", price: 5.50, description: "Carne bovina moída, temperada com cebola, tomate e especiarias.", image: "assets/carne.png", available: true },
            { id: 2, name: "Esfirra de Queijo", price: 5.00, description: "Queijo mussarela fresco e cremoso.", image: "assets/queijo.png", available: true },
        ],
        "Refrigerantes": [ 
            { id: 3, name: "Coca-Cola Lata", price: 7.50, description: "Lata de 350ml.", image: "assets/coca.png", available: true },
            { id: 4, name: "Guaraná Lata", price: 8.50, description: "Lata de 350ml.", image: "assets/guarana.png", available: false }
        ]
    };

    // --- DATA & THEME PERSISTENCE ---
    function saveData() { localStorage.setItem('zapEsfirrasAdminState', JSON.stringify({ orders: state.orders, menu: state.menu })); }
    function loadData() { const savedState = JSON.parse(localStorage.getItem('zapEsfirrasAdminState')); if (savedState) { state.orders = savedState.orders || initialMockOrders; state.menu = savedState.menu || initialMockMenu; } else { state.orders = initialMockOrders; state.menu = initialMockMenu; } }
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

    // --- CORE RENDERING LOGIC ---
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
    
    // --- DASHBOARD ---
    function renderDashboard() {
        const viewElement = document.getElementById('view-dashboard');
        const today = new Date().toISOString().split('T')[0];
        const ordersToday = state.orders.filter(o => o.date === today);
        const revenueToday = ordersToday.reduce((sum, order) => sum + order.valor, 0);
        const revenueThisMonth = 0;
        const revenueLastMonth = 0;
        viewElement.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card faturamento-hoje"><div class="stat-card-header"><div class="icon"><ion-icon name="cash-outline"></ion-icon></div><h3>Faturamento Hoje</h3></div><div class="stat-card-main-value">${formatCurrency(revenueToday)}</div><div class="stat-card-footer">Atualizado em tempo real</div></div>
                <div class="stat-card pedidos-hoje"><div class="stat-card-header"><div class="icon"><ion-icon name="receipt-outline"></ion-icon></div><h3>Pedidos Hoje</h3></div><div class="stat-card-main-value">${ordersToday.length}</div><div class="stat-card-footer">Total de pedidos recebidos</div></div>
                <div class="stat-card mes-atual"><div class="stat-card-header"><div class="icon"><ion-icon name="calendar-outline"></ion-icon></div><h3>Vendas Mês Atual</h3></div><div class="stat-card-main-value">${formatCurrency(revenueThisMonth)}</div><div class="stat-card-footer">Aguardando novos pedidos</div></div>
                <div class="stat-card mes-anterior"><div class="stat-card-header"><div class="icon"><ion-icon name="archive-outline"></ion-icon></div><h3>Vendas Mês Anterior</h3></div><div class="stat-card-main-value">${formatCurrency(revenueLastMonth)}</div><div class="stat-card-footer">Dados do mês anterior</div></div>
            </div>`;
    }

    // --- PEDIDOS ---
    function renderPedidosView() { 
        const viewElement = document.getElementById('view-pedidos'); 
        const statuses = ['Novo', 'Em Preparo', 'Prontos', 'Em Entrega', 'Finalizado']; 
        const statusConfig = { 
            'Novo': { icon: 'sparkles-outline', title: 'Novos Pedidos' },
            'Em Preparo': { icon: 'flame-outline', title: 'Em Preparo' }, 
            'Prontos': { icon: 'checkmark-done-outline', title: 'Prontos (Retirada)' }, 
            'Em Entrega': { icon: 'bicycle-outline', title: 'Em Entrega' }, 
            'Finalizado': { icon: 'archive-outline', title: 'Finalizados' } 
        }; 
        viewElement.innerHTML = `<div class="pedidos-layout"><div class="pedidos-lista-vertical">${statuses.map(status => renderOrderStatusSection(status, statusConfig[status])).join('')}</div><div class="pedidos-detalhes-coluna" id="pedidos-detalhes-coluna"></div></div>`; 
        renderOrderDetails(state.selectedOrderId); 
    }

    function renderOrderStatusSection(status, config) { 
        const ordersInSection = state.orders.filter(order => order.status === status); 
        const isCollapsed = state.collapsedSections.has(status); 
        return `<div class="status-section ${isCollapsed ? 'collapsed' : ''}" data-status="${status}"><div class="section-header"><ion-icon name="${config.icon}"></ion-icon><h3>${config.title}</h3><span class="count">${ordersInSection.length}</span><ion-icon name="chevron-down-outline" class="toggle-arrow"></ion-icon></div><div class="section-body">${ordersInSection.length > 0 ? ordersInSection.map(renderOrderCard).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 16px 0;">Nenhum pedido nesta etapa.</p>'}</div></div>`; 
    }

    function renderOrderCard(order) { 
        let actionButtonHTML = ''; 
        if (order.status === 'Novo') {
             actionButtonHTML = `<button class="btn btn-primary action-button" data-order-id="${order.id}" data-next-status="Em Preparo"><ion-icon name="checkmark-outline"></ion-icon>Aceitar Pedido</button>`;
        } else if (order.status === 'Em Preparo') { 
            actionButtonHTML = order.tipo === 'Entrega' ? `<button class="btn action-button dispatch" data-order-id="${order.id}" data-next-status="Em Entrega"><ion-icon name="bicycle-outline"></ion-icon>Despachar Pedido</button>` : `<button class="btn action-button ready" data-order-id="${order.id}" data-next-status="Prontos"><ion-icon name="checkmark-outline"></ion-icon>Pedido Pronto</button>`; 
        } else if (order.status === 'Prontos' || order.status === 'Em Entrega') { 
            actionButtonHTML = `<button class="btn action-button complete" data-order-id="${order.id}" data-next-status="Finalizado"><ion-icon name="archive-outline"></ion-icon>Finalizar</button>`; 
        } 
        let addressHTML = ''; 
        if (order.tipo === 'Entrega') { 
            const { rua, numero, bairro, complemento } = order.entrega; 
            addressHTML = `<div class="order-card-address"><p><ion-icon name="location-outline"></ion-icon> <b>Rua:</b> ${rua}, ${numero}</p><p><b>Bairro:</b> ${bairro}</p>${complemento ? `<p><b>Comp:</b> ${complemento}</p>` : ''}</div>`; 
        } 
        const isNew = order.status === 'Novo';
        return `<div class="order-card ${state.selectedOrderId == order.id ? 'active' : ''} ${isNew ? 'new-order' : ''}" data-order-id="${order.id}"><div class="order-card-header"><b>#${order.id}</b><span>${formatCurrency(order.valor)}</span></div><p class="order-card-customer">${order.cliente.nome}</p><div class="order-card-info"><span><ion-icon name="time-outline"></ion-icon>${order.horario}</span><span><ion-icon name="${order.tipo === 'Entrega' ? 'bicycle-outline' : 'walk-outline'}"></ion-icon>${order.tipo}</span></div>${addressHTML}<div class="order-card-footer">${actionButtonHTML}</div></div>`; 
    }
    
    function renderOrderDetails(orderId) { 
        const detailsColumn = document.getElementById('pedidos-detalhes-coluna'); 
        const order = state.orders.find(o => o.id == orderId); 
        if (!order) { 
            detailsColumn.innerHTML = `<div class="placeholder-detalhes"><ion-icon name="receipt-outline"></ion-icon><h3>Selecione um Pedido</h3><p>Clique em um card para ver os detalhes.</p></div>`; 
            return; 
        } 
        const address = order.entrega.rua === 'Retirar no local' ? '<p><b>Endereço:</b> Retirar no local</p>' : `<p><b>Endereço:</b> ${order.entrega.rua}, ${order.entrega.numero}</p><p><b>Bairro:</b> ${order.entrega.bairro}</p>${order.entrega.complemento ? `<p><b>Comp:</b> ${order.entrega.complemento}</p>` : ''}`; 
        
        detailsColumn.innerHTML = `
            <div class="details-content">
                <div class="details-header"><h3>Pedido #${order.id}</h3><span class="status-tag ${getStatusClass(order.status)}">${order.status}</span></div>
                <div class="details-card-header"><ion-icon name="person-outline"></ion-icon>Cliente</div>
                <div class="details-card-body"><p><b>Nome:</b> ${order.cliente.nome}</p></div>
                <div class="details-card-header"><ion-icon name="location-outline"></ion-icon>Entrega</div>
                <div class="details-card-body"><p><b>Tipo:</b> ${order.tipo}</p>${address}</div>
                <div class="details-card-header"><ion-icon name="fast-food-outline"></ion-icon>Itens</div>
                <div class="details-card-body">
                    ${(order.itens || []).map(item => `<div class="order-item-row"><span>${item.quantity || 1}x ${item.name || 'Item não encontrado'}</span><span>${formatCurrency(item.total || 0)}</span></div>`).join('')}
                    <div class="details-total-row"><span>Total</span><span>${formatCurrency(order.valor)}</span></div>
                </div>
                <div class="details-card-header"><ion-icon name="wallet-outline"></ion-icon>Pagamento</div>
                <div class="details-card-body"><p><b>Método:</b> ${order.pagamento.metodo || 'Não informado'}</p>${order.pagamento.detalhes ? `<p><b>Detalhes:</b> ${order.pagamento.detalhes}</p>` : ''}</div>
            </div>
            <div class="details-footer"><button class="btn btn-primary print-button"><ion-icon name="print-outline"></ion-icon>Imprimir</button></div>`; 
    }

    // --- CARDÁPIO ---
    function renderCardapioView() {
        const viewElement = document.getElementById('view-cardapio');
        const categories = Object.keys(state.menu);
        viewElement.innerHTML = `<div class="view-header"><div><h2>Cardápio</h2><p>Gerencie os produtos e categorias.</p></div><button class="btn btn-primary" id="add-new-product-btn"><ion-icon name="add-outline"></ion-icon>Adicionar Produto</button></div><div class="cardapio-grid">${categories.length > 0 ? categories.map(category => `<div class="category-section"><h3 class="category-header">${category}</h3><div class="product-grid">${state.menu[category].map(createProductCardHTML).join('')}</div></div>`).join('') : '<p>Nenhum item no cardápio.</p>'}</div>`;
    }
    
    function createProductCardHTML(product) {
        return `<div class="product-card" data-product-id="${product.id}"><div class="product-options"><button class="options-button"><ion-icon name="ellipsis-vertical"></ion-icon></button><div class="options-menu"><button class="edit-product-btn" data-product-id="${product.id}">Editar</button><button class="delete-product-btn delete-btn" data-product-id="${product.id}">Excluir</button></div></div><img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x160.png?text=Sem+Imagem';"><div class="product-info"><h4>${product.name}</h4><p class="price">${formatCurrency(product.price)}</p><p class="description">${product.description || 'Sem descrição.'}</p></div><div class="product-actions"><div class="product-availability-switch"><span>Disponível</span><label class="switch"><input type="checkbox" class="availability-toggle" data-product-id="${product.id}" ${product.available ? 'checked' : ''}><span class="slider"></span></label></div></div></div>`;
    }

    // --- RELATÓRIOS ---
    function renderRelatoriosView() {
        const viewElement = document.getElementById('view-relatorios');
        const salesByProduct = state.orders.flatMap(o => o.itens).reduce((acc, item) => {
            const itemName = item.name || item.nome || 'Item desconhecido';
            if (!acc[itemName]) { acc[itemName] = { quantity: 0, total: 0 }; }
            acc[itemName].quantity += (item.quantity || 1);
            acc[itemName].total += (item.total || item.valor || 0);
            return acc;
        }, {});
        viewElement.innerHTML = `<div class="view-header"><h2>Relatórios</h2><p>Analise o desempenho de suas vendas.</p></div><div class="report-container"><div class="report-filters"><div class="form-group"><label for="report-type">Tipo de Relatório</label><select id="report-type"><option>Vendas por Produto</option></select></div><div class="form-group"><label for="date-range">Período</label><input type="text" id="date-range" value="Últimos 30 dias"></div><button class="btn btn-primary">Gerar</button></div><div class="report-table-container"><table class="report-table"><thead><tr><th>Produto</th><th>Itens Vendidos</th><th>Receita Bruta</th></tr></thead><tbody>${Object.entries(salesByProduct).map(([name, data]) => `<tr><td>${name}</td><td>${data.quantity}</td><td>${formatCurrency(data.total)}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
    
    // --- CONFIGURAÇÕES ---
    function renderConfiguracoesView() {
        const viewElement = document.getElementById('view-configuracoes');
        viewElement.innerHTML = `<div class="view-header"><h2>Configurações</h2><p>Ajustes gerais do painel e da loja.</p></div><div class="settings-grid"><div class="settings-card"><h3>Aparência</h3><div class="setting-item"><label for="theme-toggle">Modo Escuro</label><label class="switch"><input type="checkbox" id="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}><span class="slider"></span></label></div></div><div class="settings-card"><h3>Loja (Em breve)</h3><p>Aqui você poderá editar informações como nome, endereço e horário de funcionamento.</p></div></div>`;
    }

    // --- MODAL LOGIC ---
    function openProductModal(productData = null) {
        const modal = document.getElementById('product-modal-overlay');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('product-form');
        const imagePreview = document.getElementById('image-preview');
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-image-base64').value = '';
        imagePreview.src = 'https://via.placeholder.com/150x150.png?text=Sem+Imagem';
        if (productData) {
            title.textContent = "Editar Produto";
            document.getElementById('product-id').value = productData.id;
            document.getElementById('product-name').value = productData.name;
            document.getElementById('product-category').value = findCategoryByProductId(productData.id);
            document.getElementById('product-price').value = productData.price;
            document.getElementById('product-description').value = productData.description;
            if (productData.image) {
                imagePreview.src = productData.image;
                if (!productData.image.startsWith('data:image')) {
                    document.getElementById('product-image-url').value = productData.image;
                }
            }
        } else {
            title.textContent = "Adicionar Novo Produto";
        }
        modal.classList.add('visible');
    }

    function saveProduct(e) {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const imageBase64 = document.getElementById('product-image-base64').value;
        const imageUrl = document.getElementById('product-image-url').value;
        let finalImage = imageUrl;
        if (imageBase64) {
            finalImage = imageBase64;
        }
        const productData = { name: document.getElementById('product-name').value, price: parseFloat(document.getElementById('product-price').value), description: document.getElementById('product-description').value, image: finalImage, available: true };
        const category = document.getElementById('product-category').value;
        if (id) {
            productData.id = parseInt(id);
            if (!finalImage && !imageUrl) { const oldProduct = Object.values(state.menu).flat().find(p => p.id == id); productData.image = oldProduct.image; }
            const oldCategory = findCategoryByProductId(id);
            if(oldCategory) { state.menu[oldCategory] = state.menu[oldCategory].filter(p => p.id != id); if (state.menu[oldCategory].length === 0) delete state.menu[oldCategory]; }
            if (!state.menu[category]) state.menu[category] = [];
            state.menu[category].push(productData);
            showNotification('Produto atualizado!', 'success');
        } else {
            productData.id = Date.now();
            if (!state.menu[category]) state.menu[category] = [];
            state.menu[category].push(productData);
            showNotification('Produto adicionado!', 'success');
        }
        saveData();
        closeProductModal();
        renderCardapioView();
    }
    
    function closeProductModal() { document.getElementById('product-modal-overlay').classList.remove('visible'); }
    function openConfirmModal(productId) { const modal = document.getElementById('confirm-modal-overlay'); modal.dataset.productIdToDelete = productId; modal.classList.add('visible'); }
    function closeConfirmModal() { document.getElementById('confirm-modal-overlay').classList.remove('visible'); }
    function deleteProduct(productId) { const category = findCategoryByProductId(productId); if(category) { state.menu[category] = state.menu[category].filter(p => p.id != productId); if(state.menu[category].length === 0) delete state.menu[category]; saveData(); showNotification('Produto excluído!', 'success'); renderCardapioView(); } closeConfirmModal(); }

    // --- LÓGICA DE IMPRESSÃO ---
    function directPrint(orderId) {
        const order = state.orders.find(o => o.id == orderId);
        if (!order) {
            showNotification("Pedido não encontrado para impressão.", "error");
            return;
        }
        showNotification("Preparando para imprimir...", "success");
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
        
        const itemsHTML = (order.itens || []).map(item => {
            const itemName = item.name || item.nome || 'Item desconhecido';
            const itemQty = item.quantity || 1;
            const itemTotal = item.total || item.valor || 0;
            return `<tr><td>${itemQty}x</td><td>${itemName}</td><td>${formatCurrency(itemTotal)}</td></tr>`;
        }).join('');
        
        const receiptStyle = `<style>body{font-family:'Courier New',monospace;font-size:12px;line-height:1.6;color:#000;margin:0;padding:0}.receipt-container{width:302px;padding:15px}.receipt-header{text-align:center;margin-bottom:15px}.receipt-header img{max-width:80px;margin-bottom:10px}.receipt-header h3{font-size:16px;margin:0}.receipt-section{border-top:1px dashed #000;padding-top:10px;margin-top:10px}.receipt-section h4{text-align:center;font-size:14px;margin:0 0 10px 0}.receipt-section p{margin:0 0 3px 0}.receipt-items-table{width:100%;margin-top:10px}.receipt-items-table th,.receipt-items-table td{text-align:left;padding:3px 0}.receipt-items-table th:last-child,.receipt-items-table td:last-child{text-align:right}.receipt-items-table thead{border-bottom:1px dashed #000}.receipt-total{text-align:right;margin-top:15px}.receipt-total p{font-size:14px;font-weight:bold;margin:0}.receipt-footer{text-align:center;margin-top:20px;font-size:11px}@page{margin:5mm}</style>`;
        const receiptHTML = `<div class="receipt-container"><div class="receipt-header"><img src="assets/zapesfiiras.png" alt="Logo"><h3>Zap Esfirras</h3><p>Rua Exemplo, 123 - Centro</p><p>Tel: (19) 99999-8888</p><p>--------------------------------</p><p><strong>PEDIDO #${order.id}</strong></p><p>${formattedDate}</p></div><div class="receipt-section"><h4>Cliente</h4><p><strong>Nome:</strong> ${order.cliente.nome}</p>${order.cliente.telefone ? `<p><strong>Tel:</strong> ${order.cliente.telefone}</p>` : ''}</div><div class="receipt-section"><h4>Entrega / Retirada</h4><p><strong>Tipo:</strong> ${order.tipo}</p>${order.tipo === 'Entrega' ? `<p><strong>End:</strong> ${order.entrega.rua}, ${order.entrega.numero}</p><p><strong>Bairro:</strong> ${order.entrega.bairro}</p>${order.entrega.complemento ? `<p><strong>Comp:</strong> ${order.entrega.complemento}</p>` : ''}` : ''}</div><div class="receipt-section"><h4>Itens do Pedido</h4><table class="receipt-items-table"><thead><tr><th>Qtd</th><th>Item</th><th>Total</th></tr></thead><tbody>${itemsHTML}</tbody></table></div><div class="receipt-section receipt-total"><p>SUBTOTAL: ${formatCurrency(order.valor)}</p><p><strong>TOTAL: ${formatCurrency(order.valor)}</strong></p></div><div class="receipt-section"><h4>Pagamento</h4><p><strong>Método:</strong> ${order.pagamento.metodo}</p>${order.pagamento.detalhes ? `<p><strong>Obs:</strong> ${order.pagamento.detalhes}</p>` : ''}</div><div class="receipt-footer"><p>Obrigado pela preferência!</p></div></div>`;

        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
        printFrame.contentDocument.write(`<html><head>${receiptStyle}</head><body>${receiptHTML}</body></html>`);
        printFrame.contentDocument.close();
        printFrame.onload = function() {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            document.body.removeChild(printFrame);
        };
    }
    
    // --- FUNÇÕES UTILITÁRIAS ---
    const formatCurrency = (value) => value != null ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    const findCategoryByProductId = (productId) => Object.keys(state.menu).find(cat => state.menu[cat].some(p => p.id == productId));
    function toggleProductAvailability(productId, isAvailable) { const product = Object.values(state.menu).flat().find(p => p.id == productId); if(product) { product.available = isAvailable; saveData(); showNotification(`Disponibilidade atualizada.`, 'success'); } }
    function showNotification(message, type = "success") { const area = document.getElementById('notification-area'), notification = document.createElement('div'); notification.className = `notification-message ${type}`; notification.textContent = message; area.appendChild(notification); setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); }, 3000); }
    const getStatusClass = (status) => status.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    function updateOrderStatus(orderId, newStatus) {
        const order = state.orders.find(o => o.id == orderId);
        if (order) {
            const oldStatus = order.status;
            order.status = newStatus;
            saveData();
            renderPedidosView();
            if (oldStatus === 'Novo' && newStatus === 'Em Preparo') {
                directPrint(orderId);
            }
        }
    }
    
    // --- SIMULADOR DE NOVOS PEDIDOS ---
    function simulateNewOrder() {
        const newId = (state.orders.length > 0 ? Math.max(...state.orders.map(o => o.id)) : 4860) + 1;
        const newOrder = { id: newId, date: new Date().toISOString().split('T')[0], cliente: { nome: "Cliente Simulado", telefone: "19 00000-0000" }, horario: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}), valor: 42.50, tipo: "Entrega", status: "Novo", entrega: { rua: "Rua Fictícia", numero: "S/N", bairro: "Bairro Demo", complemento: "" }, pagamento: { metodo: "Pix", detalhes: "Pagamento online" }, itens: [{ name: "Esfirra de Queijo", quantity: 5, total: 25.00 }, {name: "Guaraná Lata", quantity: 2, total: 17.50}] };
        state.orders.unshift(newOrder);
        saveData();
        showNotification(`Novo pedido #${newId} recebido!`, 'success');
        notificationSound.play().catch(e => console.log("Autoplay de áudio bloqueado."));
        if(state.currentView === 'pedidos' || state.currentView === 'dashboard') {
             renderView(state.currentView);
        }
    }
    setInterval(simulateNewOrder, 30000);

    // --- EVENT LISTENERS ---
    function toggleSidebar() {
        sidebar.classList.toggle('visible');
        sidebarOverlay.classList.toggle('active');
    }
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    });
    
    document.addEventListener('click', (e) => {
        if (e.target.closest('.print-button')) { directPrint(state.selectedOrderId); }
        if (e.target.id === 'upload-image-button') { document.getElementById('product-image-file').click(); }
        const navLink = e.target.closest('.nav-link');
        if (navLink && !navLink.id.includes('logout')) { 
            if (window.innerWidth <= 992 && sidebar.classList.contains('visible')) {
                toggleSidebar();
            }
            if(!navLink.classList.contains('active')) {
                e.preventDefault(); 
                document.querySelector('.nav-link.active')?.classList.remove('active'); 
                navLink.classList.add('active'); 
                renderView(navLink.dataset.view); 
            }
            return; 
        }
        if (state.currentView === 'pedidos') { const card = e.target.closest('.order-card'); const button = e.target.closest('.action-button'); const sectionHeader = e.target.closest('.section-header'); if (button) { e.stopPropagation(); updateOrderStatus(button.dataset.orderId, button.dataset.nextStatus); } else if (card) { state.selectedOrderId = card.dataset.orderId; renderPedidosView(); } else if (sectionHeader) { const status = sectionHeader.parentElement.dataset.status; if (state.collapsedSections.has(status)) { state.collapsedSections.delete(status); } else { state.collapsedSections.add(status); } renderPedidosView(); } }
        if (state.currentView === 'cardapio') { const optionsButton = e.target.closest('.options-button'); if (optionsButton) { const menu = optionsButton.nextElementSibling; const isVisible = menu.style.display === 'block'; document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none'); menu.style.display = isVisible ? 'none' : 'block'; return; } if (!e.target.closest('.product-options')) document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none'); if (e.target.closest('#add-new-product-btn')) openProductModal(); if (e.target.classList.contains('edit-product-btn')) { const product = Object.values(state.menu).flat().find(p => p.id == e.target.dataset.productId); if (product) openProductModal(product); } if (e.target.classList.contains('delete-product-btn')) openConfirmModal(e.target.dataset.productId); }
        if (e.target.closest('#cancel-modal-button') || e.target.closest('#close-modal-button')) closeProductModal();
        if (e.target.closest('#cancel-confirm-button')) closeConfirmModal();
        if (e.target.closest('#confirm-delete-button')) deleteProduct(document.getElementById('confirm-modal-overlay').dataset.productIdToDelete);
    });
    
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('availability-toggle')) { toggleProductAvailability(e.target.dataset.productId, e.target.checked); }
        if (e.target.id === 'theme-toggle') { applyTheme(e.target.checked ? 'dark' : 'light'); }
        if (e.target.id === 'product-image-file' && e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('image-preview').src = event.target.result;
                document.getElementById('product-image-base64').value = event.target.result;
                document.getElementById('product-image-url').value = '';
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target.id === 'product-image-url') {
            document.getElementById('image-preview').src = e.target.value || 'https://via.placeholder.com/150x150.png?text=...';
            document.getElementById('product-image-base64').value = '';
        }
    });
    
    document.addEventListener('submit', (e) => { if(e.target.id === 'product-form') saveProduct(e); });

    // --- INITIALIZATION ---
    function init() {
        loadData();
        loadTheme();
        renderView('dashboard');
    }

    init();
});