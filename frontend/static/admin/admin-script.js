document.addEventListener('DOMContentLoaded', () => {

    // --- PROTEÇÃO DE TELA E BOAS-VINDAS ---
    const adminToken = sessionStorage.getItem('adminAuthToken');
    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (!adminToken || !loggedInUser) {
        sessionStorage.clear();
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
        lastCounterResetDate: null,
        newOrdersCount: 0 
    };

    // --- ELEMENT SELECTORS ---
    const pageTitle = document.getElementById('page-title');
    const notificationSound = document.getElementById('notification-sound');
    const audioUnlockPrompt = document.getElementById('audio-unlock-prompt');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const logoutButton = document.getElementById('logout-button');
    let isAudioUnlocked = false;

    // --- LÓGICA DE NOTIFICAÇÃO E SOM ---
    let intervalId = null;
    const originalTitle = document.title;
    function startTitleNotification() { if (intervalId) return; intervalId = setInterval(() => { if (document.hasFocus()) { stopTitleNotification(); } else { document.title = document.title === originalTitle ? `(${state.newOrdersCount}) Novo Pedido!` : originalTitle; } }, 1000); }
    function stopTitleNotification() { clearInterval(intervalId); intervalId = null; state.newOrdersCount = 0; document.title = originalTitle; }
    window.addEventListener('focus', () => { if (intervalId) { stopTitleNotification(); } });
    function unlockAudio() { if (isAudioUnlocked) return; notificationSound.play().catch(() => {}).then(() => { notificationSound.pause(); notificationSound.currentTime = 0; isAudioUnlocked = true; console.log('Contexto de áudio liberado pelo usuário.'); if (audioUnlockPrompt) { audioUnlockPrompt.classList.remove('visible'); } }); }

    // --- LÓGICA DE SOCKET.IO ---
    const socket = io('http://localhost:3000');
    socket.on('new_order', (newOrder) => {
        console.log('Novo pedido recebido via WebSocket!', newOrder);
        if (isAudioUnlocked) { notificationSound.play().catch(e => console.error("Erro ao tocar som:", e)); } else { if (audioUnlockPrompt) { audioUnlockPrompt.classList.add('visible'); } console.warn('Áudio bloqueado...'); }
        showNotification(`Novo pedido #${newOrder.id} recebido!`, 'success');
        state.orders.unshift(newOrder);
        if (state.currentView === 'pedidos' || state.currentView === 'dashboard') { renderView(state.currentView); }
        if (!document.hasFocus()) { state.newOrdersCount++; startTitleNotification(); }
    });
    
    // --- FUNÇÕES DE DADOS E ESTADO ---
    function saveData() { localStorage.setItem('zapEsfirrasAdminState', JSON.stringify({ orders: state.orders, deliveryCounter: state.deliveryCounter, lastCounterResetDate: state.lastCounterResetDate })); }
    function loadData() { const savedState = JSON.parse(localStorage.getItem('zapEsfirrasAdminState')); if (savedState) { state.orders = savedState.orders || []; state.deliveryCounter = savedState.deliveryCounter || 0; state.lastCounterResetDate = savedState.lastCounterResetDate || null; } }
    function saveTheme() { localStorage.setItem('zapEsfirrasTheme', state.theme); }
    function loadTheme() { const savedTheme = localStorage.getItem('zapEsfirrasTheme') || 'light'; applyTheme(savedTheme); }
    function applyTheme(theme) { document.body.classList.remove('light-mode', 'dark-mode'); document.body.classList.add(`${theme}-mode`); const themeToggle = document.getElementById('theme-toggle'); if (themeToggle) { themeToggle.checked = theme === 'dark'; } state.theme = theme; saveTheme(); }
    async function fetchCategoriesAndProducts() { try { const catRes = await fetch('http://localhost:3000/api/admin/categories'); if (!catRes.ok) throw new Error('Falha ao buscar categorias.'); state.categories = await catRes.json(); const prodRes = await fetch('http://localhost:3000/api/products'); if (!prodRes.ok) throw new Error('Falha ao buscar produtos.'); const prodsDB = await prodRes.json(); state.menu = prodsDB.reduce((acc, p) => { const cat = p.category_name; if (!acc[cat]) acc[cat] = []; p.available = !!p.available; acc[cat].push(p); return acc; }, {}); } catch (error) { console.error("Erro ao carregar dados:", error); showNotification("Erro: Não foi possível carregar os dados. Verifique se o servidor back-end está rodando.", "error"); } }

    // --- LÓGICA DE RENDERIZAÇÃO DAS VIEWS ---
    function renderView(viewName) { document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active')); const viewEl = document.getElementById(`view-${viewName}`); viewEl.classList.add('active'); pageTitle.textContent = document.querySelector(`.nav-link[data-view="${viewName}"] span`).textContent; state.currentView = viewName; viewEl.innerHTML = ''; const map = { dashboard: renderDashboard, pedidos: renderPedidosView, cardapio: renderCardapioView, relatorios: renderRelatoriosView, configuracoes: renderConfiguracoesView }; map[viewName](); }
    function renderDashboard() { const viewElement = document.getElementById('view-dashboard'); const today = new Date().toISOString().split('T')[0]; const ordersToday = state.orders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === today); const revenueToday = ordersToday.reduce((sum, order) => sum + parseFloat(order.total_value || 0), 0); const currentMonth = new Date().getMonth(); const ordersThisMonth = state.orders.filter(o => new Date(o.created_at).getMonth() === currentMonth); const revenueThisMonth = ordersThisMonth.reduce((sum, order) => sum + parseFloat(order.total_value || 0), 0); viewElement.innerHTML = ` <div class="dashboard-grid"> <div class="stat-card faturamento-hoje"> <div class="stat-card-header"> <div class="icon"><ion-icon name="cash-outline"></ion-icon></div> <span>Faturamento Hoje</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueToday)}</div> </div> <div class="stat-card pedidos-hoje"> <div class="stat-card-header"> <div class="icon"><ion-icon name="receipt-outline"></ion-icon></div> <span>Pedidos Hoje</span> </div> <div class="stat-card-main-value">${ordersToday.length}</div> </div> <div class="stat-card mes-atual"> <div class="stat-card-header"> <div class="icon"><ion-icon name="calendar-outline"></ion-icon></div> <span>Vendas Mês Atual</span> </div> <div class="stat-card-main-value">${formatCurrency(revenueThisMonth)}</div> </div> <div class="stat-card mes-anterior"> <div class="stat-card-header"> <div class="icon"><ion-icon name="archive-outline"></ion-icon></div> <span>Vendas Mês Anterior</span> </div> <div class="stat-card-main-value">Em breve</div> </div> </div>`; }
    function renderPedidosView() { const viewElement = document.getElementById('view-pedidos'); const statuses = ['Novo', 'Em Preparo', 'Prontos', 'Em Entrega', 'Finalizado']; const statusConfig = { 'Novo': { icon: 'sparkles-outline', title: 'Novos Pedidos' }, 'Em Preparo': { icon: 'flame-outline', title: 'Em Preparo' }, 'Prontos': { icon: 'checkmark-done-outline', title: 'Prontos (Retirada)' }, 'Em Entrega': { icon: 'bicycle-outline', title: 'Em Entrega' }, 'Finalizado': { icon: 'archive-outline', title: 'Finalizados' } }; viewElement.innerHTML = `<div class="pedidos-layout"><div class="pedidos-lista-vertical">${statuses.map(status => renderOrderStatusSection(status, statusConfig[status])).join('')}</div><div class="pedidos-detalhes-coluna" id="pedidos-detalhes-coluna"></div></div>`; renderOrderDetails(state.selectedOrderId); }
    function renderOrderStatusSection(status, config) { const ordersInSection = state.orders.filter(order => order.status === status); const isCollapsed = state.collapsedSections.has(status); return `<div class="status-section ${isCollapsed ? 'collapsed' : ''}" data-status="${status}"><div class="section-header"><ion-icon name="${config.icon}"></ion-icon><h3>${config.title}</h3><span class="count">${ordersInSection.length}</span><ion-icon name="chevron-down-outline" class="toggle-arrow"></ion-icon></div><div class="section-body">${ordersInSection.length > 0 ? ordersInSection.map(renderOrderCard).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 16px 0;">Nenhum pedido nesta etapa.</p>'}</div></div>`; }
    function renderOrderCard(order) { let actionButtonHTML = ''; if (order.status === 'Novo') { actionButtonHTML = `<button class="btn btn-primary action-button" data-order-id="${order.id}" data-next-status="Em Preparo"><ion-icon name="checkmark-outline"></ion-icon>Aceitar Pedido</button>`; } else if (order.status === 'Em Preparo') { actionButtonHTML = order.delivery_info.tipo === 'Entrega' ? `<button class="btn btn-primary action-button dispatch" data-order-id="${order.id}" data-next-status="Em Entrega"><ion-icon name="bicycle-outline"></ion-icon>Despachar Pedido</button>` : `<button class="btn btn-primary action-button ready" data-order-id="${order.id}" data-next-status="Prontos"><ion-icon name="checkmark-outline"></ion-icon>Pedido Pronto</button>`; } else if (order.status === 'Prontos' || order.status === 'Em Entrega') { actionButtonHTML = `<button class="btn btn-primary action-button complete" data-order-id="${order.id}" data-next-status="Finalizado"><ion-icon name="archive-outline"></ion-icon>Finalizar</button>`; } let addressHTML = ''; if (order.delivery_info.tipo === 'Entrega' && order.delivery_info.rua !== 'Retirar no local') { const { rua, numero, bairro, complemento } = order.delivery_info; addressHTML = `<div class="order-card-address"><p><ion-icon name="location-outline"></ion-icon> <b>Rua:</b> ${rua}, ${numero}</p><p><b>Bairro:</b> ${bairro}</p>${complemento ? `<p><b>Comp:</b> ${complemento}</p>` : ''}</div>`; } const isNew = order.status === 'Novo'; const orderTime = new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); return `<div class="order-card ${state.selectedOrderId == order.id ? 'active' : ''} ${isNew ? 'new-order' : ''}" data-order-id="${order.id}"><div class="order-card-header"><b>#${order.id}</b><span>${formatCurrency(order.total_value)}</span></div><p class="order-card-customer">${order.client_info.nome}</p>${addressHTML}<div class="order-card-info"><span><ion-icon name="time-outline"></ion-icon>${orderTime}</span><span><ion-icon name="${order.delivery_info.tipo === 'Entrega' ? 'bicycle-outline' : 'walk-outline'}"></ion-icon>${order.delivery_info.tipo}</span></div><div class="order-card-footer">${actionButtonHTML}</div></div>`; }
    function renderOrderDetails(orderId) { const detailsColumn = document.getElementById('pedidos-detalhes-coluna'); const order = state.orders.find(o => o.id == orderId); if (!order) { detailsColumn.innerHTML = `<div class="placeholder-detalhes"><ion-icon name="receipt-outline"></ion-icon><h3>Selecione um Pedido</h3><p>Clique em um card para ver os detalhes.</p></div>`; return; } const itemsHtml = order.items.map(item => ` <div class="order-item-container"> <div class="order-item-row"> <span>${item.quantity || 1}x ${item.name || 'Item não encontrado'}</span> <span>${formatCurrency(item.price * item.quantity)}</span> </div> ${item.observacao ? `<div class="order-item-obs"><b>Obs:</b> ${item.observacao}</div>` : ''} </div> `).join(''); let paymentHtml = `<p><b>Método:</b> ${order.payment_info.metodo || 'Não informado'}</p>`; if (order.payment_info.metodo === 'Dinheiro' && order.payment_info.trocoPara > 0) { const change = order.payment_info.trocoPara - order.total_value; paymentHtml += `<p><b>Pagar com:</b> ${formatCurrency(order.payment_info.trocoPara)}</p>`; if (change >= 0) { paymentHtml += `<p style="color:var(--primary-color); font-weight: bold;"><b>LEVAR TROCO: ${formatCurrency(change)}</b></p>`; } else { paymentHtml += `<p style="color: orange; font-weight: bold;"><b>ATENÇÃO: Valor do troco é menor que o total.</b></p>`; } } else if (order.payment_info.tipo) { paymentHtml += `<p><b>Detalhes:</b> ${order.payment_info.tipo}</p>`; } const address = order.delivery_info.rua === 'Retirar no local' ? '<p><b>Endereço:</b> Retirar no local</p>' : `<p><b>Endereço:</b> ${order.delivery_info.rua}, ${order.delivery_info.numero}</p> <p><b>Bairro:</b> ${order.delivery_info.bairro}</p> ${order.delivery_info.complemento ? `<p><b>Comp:</b> ${order.delivery_info.complemento}</p>` : ''} ${order.delivery_info.referencia ? `<p><b>Ref:</b> ${order.delivery_info.referencia}</p>` : ''}`; detailsColumn.innerHTML = ` <div class="details-content"> <div class="details-header"><h3>Pedido #${order.id}</h3></div> <div class="details-card-header"><ion-icon name="person-outline"></ion-icon>Cliente</div> <div class="details-card-body"><p><b>Nome:</b> ${order.client_info.nome}</p></div> <div class="details-card-header"><ion-icon name="location-outline"></ion-icon>Entrega</div> <div class="details-card-body"><p><b>Tipo:</b> ${order.delivery_info.tipo}</p>${address}</div> <div class="details-card-header"><ion-icon name="fast-food-outline"></ion-icon>Itens</div> <div class="details-card-body"> ${itemsHtml} <div class="details-total-row"><span>Total</span><span>${formatCurrency(order.total_value)}</span></div> </div> <div class="details-card-header"><ion-icon name="wallet-outline"></ion-icon>Pagamento</div> <div class="details-card-body">${paymentHtml}</div> </div> <div class="details-footer"><button class="btn btn-primary print-button"><ion-icon name="print-outline"></ion-icon>Imprimir</button></div>`; }
    function renderCardapioView() { const viewElement = document.getElementById('view-cardapio'); const sortedCategories = [...state.categories].sort((a, b) => (a.display_order || 99) - (b.display_order || 99)); let categoriesHTML = sortedCategories.map(category => { const productsInCategory = state.menu[category.name] || []; return ` <div class="category-section" data-category-name="${category.name.toLowerCase()}"> <h3 class="category-header"> <span>${category.name}</span> <div class="category-actions"> <button class="btn-category-action btn-edit-category" data-category-id="${category.id}" title="Renomear Categoria"> <ion-icon name="pencil-outline"></ion-icon> </button> <button class="btn-category-action btn-toggle-visibility ${!category.is_visible ? 'invisible' : ''}" data-category-id="${category.id}" title="${category.is_visible ? 'Tornar Invisível' : 'Tornar Visível'}"> <ion-icon name="${category.is_visible ? 'eye-outline' : 'eye-off-outline'}"></ion-icon> </button> </div> </h3> <div class="product-grid"> ${productsInCategory.map(createProductCardHTML).join('')} </div> </div>`; }).join(''); viewElement.innerHTML = ` <div class="view-header"> <div><h2>Cardápio</h2><p>Gerencie os produtos e categorias.</p></div> <div class="category-search-container"> <ion-icon name="search-outline"></ion-icon> <input type="search" id="category-search-input" placeholder="Pesquisar Categoria..."> </div> <div class="view-header-actions"> <button class="btn btn-secondary" id="add-new-category-btn"><ion-icon name="add-outline"></ion-icon>Nova Categoria</button> <button class="btn btn-primary" id="add-new-product-btn"><ion-icon name="add-outline"></ion-icon>Adicionar Produto</button> </div> </div> <div class="cardapio-grid">${categoriesHTML}</div>`; }
    function createProductCardHTML(product) { return ` <div class="product-card" data-product-id="${product.id}"><div class="product-options"><button class="options-button"><ion-icon name="ellipsis-vertical"></ion-icon></button><div class="options-menu"><button class="edit-product-btn" data-product-id="${product.id}">Editar</button><button class="delete-product-btn delete-btn" data-product-id="${product.id}">Excluir</button></div></div><div class="product-info"><h4>${product.name}</h4><p class="price">${formatCurrency(product.price)}</p><p class="description">${product.description || 'Sem descrição.'}</p></div><div class="product-actions"><div class="product-availability-switch"><span>Disponível</span><label class="switch"><input type="checkbox" class="availability-toggle" data-product-id="${product.id}" ${product.available ? 'checked' : ''}><span class="slider"></span></label></div><button class="btn-card-action btn-promo-toggle ${product.is_on_promo ? 'active' : ''}" title="Ativar/Desativar Promoção Relâmpago"><ion-icon name="flash-outline"></ion-icon></button></div></div>`; }
    function renderRelatoriosView() { const viewElement = document.getElementById('view-relatorios'); const salesByProduct = (state.orders || []).flatMap(o => o.items || []).reduce((acc, item) => { const itemName = item.name || 'Item desconhecido'; if (!acc[itemName]) { acc[itemName] = { quantity: 0, total: 0 }; } acc[itemName].quantity += (item.quantity || 1); acc[itemName].total += (item.price * item.quantity); return acc; }, {}); viewElement.innerHTML = `<div class="view-header"><h2>Relatórios</h2><p>Analise o desempenho de suas vendas.</p></div><div class="report-container"><div class="report-filters"><div class="form-group"><label for="report-type">Tipo de Relatório</label><select id="report-type"><option>Vendas por Produto</option></select></div><div class="form-group"><label for="date-range">Período</label><input type="text" id="date-range" value="Últimos 30 dias"></div><button class="btn btn-primary">Gerar</button></div><div class="report-table-container"><table class="report-table"><thead><tr><th>Produto</th><th>Itens Vendidos</th><th>Receita Bruta</th></tr></thead><tbody>${Object.entries(salesByProduct).map(([name, data]) => `<tr><td>${name}</td><td>${data.quantity}</td><td>${formatCurrency(data.total)}</td></tr>`).join('')}</tbody></table></div></div>`; }
    function renderConfiguracoesView() { const viewElement = document.getElementById('view-configuracoes'); viewElement.innerHTML = `<div class="view-header"><h2>Configurações</h2><p>Ajustes gerais do painel e da loja.</p></div><div class="settings-grid"><div class="settings-card"><h3>Aparência</h3><div class="setting-item"><label for="theme-toggle">Modo Escuro</label><label class="switch"><input type="checkbox" id="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}><span class="slider"></span></label></div></div><div class="settings-card"><h3>Loja (Em breve)</h3><p>Aqui você poderá editar informações como nome, endereço e horário de funcionamento.</p></div></div>`; }
    function renderCustomAddition(addition = { name: '', price: '' }) { const list = document.getElementById('custom-additions-list'); if (!list) return; const row = document.createElement('div'); row.className = 'custom-addition-row'; row.innerHTML = ` <div class="form-group"> <input type="text" class="custom-addition-name" placeholder="Nome do Adicional" value="${addition.name || ''}" required> </div> <div class="form-group"> <input type="number" step="0.01" class="custom-addition-price" placeholder="Preço (R$)" value="${addition.price || ''}" required> </div> <button type="button" class="btn-remove-addition"><ion-icon name="trash-outline"></ion-icon></button> `; list.appendChild(row); }
    function setupCustomAdditionsListeners() { const container = document.getElementById('custom-additions-container'); if (!container) return; document.getElementById('add-new-addition-btn').addEventListener('click', () => { renderCustomAddition(); }); document.getElementById('custom-additions-list').addEventListener('click', (e) => { const removeBtn = e.target.closest('.btn-remove-addition'); if (removeBtn) { removeBtn.closest('.custom-addition-row').remove(); } }); document.querySelectorAll('input[name="adicionais-option"]').forEach(radio => { radio.addEventListener('change', (e) => { container.style.display = e.target.value === 'custom' ? 'block' : 'none'; }); }); }
    function openProductModal(productData = null) { const modal = document.getElementById('product-modal-overlay'); const title = document.getElementById('modal-title'); const form = document.getElementById('product-form'); form.reset(); document.getElementById('product-id').value = ''; document.getElementById('image-preview').src = 'https://via.placeholder.com/150x150.png?text=Sem+Imagem'; const categorySelect = document.getElementById('product-category'); categorySelect.innerHTML = '<option value="" disabled selected>Selecione uma categoria</option>'; state.categories.forEach(category => { categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`; }); const customAdditionsContainer = document.getElementById('custom-additions-container'); const customAdditionsList = document.getElementById('custom-additions-list'); const defaultRadio = document.querySelector('input[name="adicionais-option"][value="default"]'); const customRadio = document.querySelector('input[name="adicionais-option"][value="custom"]'); customAdditionsList.innerHTML = ''; if (productData) { title.textContent = "Editar Produto"; document.getElementById('product-id').value = productData.id; document.getElementById('product-name').value = productData.name; document.getElementById('product-price').value = productData.price; document.getElementById('product-description').value = productData.description; if (productData.image) document.getElementById('image-preview').src = productData.image; categorySelect.value = productData.category_id; if (productData.custom_additions && Array.isArray(productData.custom_additions) && productData.custom_additions.length > 0) { customRadio.checked = true; customAdditionsContainer.style.display = 'block'; productData.custom_additions.forEach(addition => renderCustomAddition(addition)); } else { defaultRadio.checked = true; customAdditionsContainer.style.display = 'none'; } } else { title.textContent = "Adicionar Novo Produto"; defaultRadio.checked = true; customAdditionsContainer.style.display = 'none'; } modal.classList.add('visible'); setupCustomAdditionsListeners(); }
    async function saveProduct(e) { e.preventDefault(); const id = document.getElementById('product-id').value; let customAdditions = null; if (document.querySelector('input[name="adicionais-option"]:checked').value === 'custom') { customAdditions = []; document.querySelectorAll('.custom-addition-row').forEach(row => { const name = row.querySelector('.custom-addition-name').value; const price = parseFloat(row.querySelector('.custom-addition-price').value); if (name && !isNaN(price)) { customAdditions.push({ name, price }); } }); } const productData = { name: document.getElementById('product-name').value, price: parseFloat(document.getElementById('product-price').value), category_id: parseInt(document.getElementById('product-category').value), description: document.getElementById('product-description').value, image: document.getElementById('image-preview').src, available: true, custom_additions: customAdditions }; try { let response; if (id) { response = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) }); if (!response.ok) throw new Error('Falha ao atualizar o produto.'); showNotification('Produto atualizado com sucesso!', 'success'); } else { response = await fetch('http://localhost:3000/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) }); if (!response.ok) throw new Error('Falha ao criar o produto.'); showNotification('Produto adicionado com sucesso!', 'success'); } closeProductModal(); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao salvar produto:', error); showNotification(error.message, 'error'); } }
    function closeProductModal() { document.getElementById('product-modal-overlay').classList.remove('visible'); }
    function openConfirmModal(productId) { const modal = document.getElementById('confirm-modal-overlay'); modal.dataset.productIdToDelete = productId; modal.classList.add('visible'); }
    function closeConfirmModal() { document.getElementById('confirm-modal-overlay').classList.remove('visible'); }
    async function deleteProduct(productId) { try { const response = await fetch(`http://localhost:3000/api/products/${productId}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Falha ao excluir o produto.'); showNotification('Produto excluído com sucesso!', 'success'); closeConfirmModal(); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao excluir produto:', error); showNotification(error.message, 'error'); } }
    async function renameCategory(categoryId) { const category = state.categories.find(c => c.id === categoryId); if (!category) return; const newName = prompt(`Digite o novo nome para a categoria "${category.name}":`, category.name); if (newName && newName.trim() !== '' && newName !== category.name) { try { const updatedCategory = { ...category, name: newName.trim() }; const response = await fetch(`http://localhost:3000/api/categories/${categoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCategory) }); if (!response.ok) throw new Error('Falha ao renomear a categoria.'); showNotification('Categoria renomeada com sucesso!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao renomear categoria:', error); showNotification(error.message, 'error'); } } }
    async function toggleCategoryVisibility(categoryId) { const category = state.categories.find(c => c.id === categoryId); if (!category) return; try { const updatedCategory = { ...category, is_visible: !category.is_visible }; const response = await fetch(`http://localhost:3000/api/categories/${categoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedCategory) }); if (!response.ok) throw new Error('Falha ao alterar a visibilidade.'); showNotification('Visibilidade da categoria alterada!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao alterar visibilidade:', error); showNotification(error.message, 'error'); } }
    async function createNewCategory() { const name = prompt("Digite o nome da nova categoria:"); if (name && name.trim() !== '') { try { const response = await fetch('http://localhost:3000/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }); if (!response.ok) throw new Error('Falha ao criar a categoria.'); showNotification('Nova categoria criada com sucesso!', 'success'); await fetchCategoriesAndProducts(); renderCardapioView(); } catch (error) { console.error('Erro ao criar categoria:', error); showNotification(error.message, 'error'); } } }
    function showNotification(message, type = "success") { const area = document.getElementById('notification-area'); if(!area) return; const notification = document.createElement('div'); notification.className = `notification-message ${type}`; notification.textContent = message; area.appendChild(notification); setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); }, 3000); }
    const formatCurrency = (value) => value != null ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
    const findCategoryByProductId = (productId) => { const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) { return state.categories.find(c => c.name === product.category_name); } return null; };
    async function toggleProductAvailability(productId, isAvailable) { const category = findCategoryByProductId(productId); if (!category) return; const product = state.menu[category.name].find(p => p.id == productId); if (product) { const updatedProduct = { ...product, available: isAvailable, category_id: product.category_id }; try { const response = await fetch(`http://localhost:3000/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) }); if (!response.ok) throw new Error('Falha ao atualizar disponibilidade.'); product.available = isAvailable; showNotification(`Disponibilidade atualizada.`, 'success'); } catch (error) { console.error('Erro ao atualizar disponibilidade:', error); showNotification(error.message, 'error'); const checkbox = document.querySelector(`.availability-toggle[data-product-id="${productId}"]`); if (checkbox) checkbox.checked = !isAvailable; } } }
    function incrementAndGetDeliveryNumber() { const today = new Date().toISOString().split('T')[0]; if (state.lastCounterResetDate !== today) { state.deliveryCounter = 0; state.lastCounterResetDate = today; } state.deliveryCounter++; saveData(); return `F${String(state.deliveryCounter).padStart(2, '0')}`; }
    async function updateOrderStatus(orderId, newStatus) { const order = state.orders.find(o => o.id == orderId); if (!order) return; const oldStatus = order.status; let deliveryNumber = order.delivery_number; if (order.delivery_info.tipo === 'Entrega' && oldStatus === 'Novo' && newStatus === 'Em Preparo') { if (!deliveryNumber) { deliveryNumber = incrementAndGetDeliveryNumber(); } } const updateData = { status: newStatus, delivery_number: deliveryNumber }; try { const response = await fetch(`http://localhost:3000/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) }); if (!response.ok) { throw new Error('Falha ao atualizar o status do pedido no servidor.'); } order.status = newStatus; if (deliveryNumber) { order.delivery_number = deliveryNumber; } renderPedidosView(); showNotification(`Pedido #${orderId} atualizado para "${newStatus}".`, 'success'); } catch (error) { console.error("Erro ao atualizar status:", error); showNotification(error.message, "error"); } }
    function toggleSidebar() { const sidebar = document.getElementById('sidebar'); const sidebarOverlay = document.getElementById('sidebar-overlay'); sidebar.classList.toggle('visible'); sidebarOverlay.classList.toggle('active'); }
    
    // =======================================================
    // === NOVA LÓGICA DO MODAL E FUNÇÕES DE PROMOÇÃO ===
    // =======================================================

    function openPromoModal(productId) {
        const product = Object.values(state.menu).flat().find(p => p.id == productId);
        if (!product) return;

        const modal = document.getElementById('promo-modal-overlay');
        const form = document.getElementById('promo-form');
        form.reset();

        document.getElementById('promo-modal-title').textContent = `Promoção para: ${product.name}`;
        document.getElementById('promo-product-id').value = productId;
        
        const deactivateBtn = document.getElementById('btn-deactivate-promo');
        deactivateBtn.style.display = product.is_on_promo ? 'inline-flex' : 'none';

        document.getElementById('promo-price').value = product.promo_price || '';
        document.getElementById('promo-hours').value = 1;
        document.getElementById('promo-minutes').value = 0;
        document.getElementById('promo-seconds').value = 0;

        modal.classList.add('visible');
    }

    function closePromoModal() {
        document.getElementById('promo-modal-overlay').classList.remove('visible');
    }

    async function savePromotion(e) {
        e.preventDefault();
        const productId = document.getElementById('promo-product-id').value;
        const promoPrice = parseFloat(document.getElementById('promo-price').value);
        const hours = parseFloat(document.getElementById('promo-hours').value) || 0;
        const minutes = parseFloat(document.getElementById('promo-minutes').value) || 0;
        const seconds = parseFloat(document.getElementById('promo-seconds').value) || 0;

        const totalHours = hours + (minutes / 60) + (seconds / 3600);

        if (isNaN(promoPrice) || promoPrice <= 0) {
            alert('Por favor, insira um preço promocional válido.');
            return;
        }
        if (totalHours <= 0) {
            alert('A duração da promoção deve ser maior que zero.');
            return;
        }

        await updatePromotion(productId, true, promoPrice, totalHours);
    }

    async function updatePromotion(productId, isOnPromo, promoPrice, durationHours) {
        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}/promotion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_on_promo: isOnPromo,
                    promo_price: promoPrice,
                    duration_hours: durationHours
                })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar a promoção.');
            }
    
            showNotification('Promoção atualizada com sucesso!', 'success');
            closePromoModal();
            await fetchCategoriesAndProducts();
            renderCardapioView();
    
        } catch (error) {
            console.error('Erro ao alternar promoção:', error);
            showNotification(error.message, 'error');
        }
    }

    // --- EVENT LISTENERS GLOBAIS ---
    document.body.addEventListener('click', unlockAudio, { once: true });
    
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('adminAuthToken');
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    });
    
    document.addEventListener('input', (e) => {
        if (e.target.id === 'category-search-input') { const searchTerm = e.target.value.toLowerCase(); document.querySelectorAll('.category-section').forEach(section => { section.style.display = section.dataset.categoryName.includes(searchTerm) ? 'block' : 'none'; }); }
        if (e.target.id === 'product-image-url') { document.getElementById('image-preview').src = e.target.value || 'https://via.placeholder.com/150x150.png?text=...'; }
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.print-button')) { const orderToPrint = state.orders.find(o => o.id == state.selectedOrderId); if (orderToPrint) { socket.emit('print_new_order', orderToPrint); showNotification("Comando de impressão manual enviado.", "success"); } return; }
        if (target.id === 'upload-image-button') { document.getElementById('product-image-file').click(); return; }
        const navLink = target.closest('.nav-link'); if (navLink && !navLink.id.includes('logout')) { if (window.innerWidth <= 992 && sidebar.classList.contains('visible')) { toggleSidebar(); } if (!navLink.classList.contains('active')) { e.preventDefault(); document.querySelector('.nav-link.active')?.classList.remove('active'); navLink.classList.add('active'); renderView(navLink.dataset.view); } return; }
        if (state.currentView === 'pedidos') { const card = target.closest('.order-card'); const button = target.closest('.action-button'); const sectionHeader = target.closest('.section-header'); if (button) { e.stopPropagation(); updateOrderStatus(button.dataset.orderId, button.dataset.nextStatus); } else if (card) { state.selectedOrderId = card.dataset.orderId; const currentActive = document.querySelector('.order-card.active'); if (currentActive) { currentActive.classList.remove('active'); } card.classList.add('active'); renderOrderDetails(state.selectedOrderId); } else if (sectionHeader) { const status = sectionHeader.parentElement.dataset.status; if (state.collapsedSections.has(status)) { state.collapsedSections.delete(status); } else { state.collapsedSections.add(status); } renderPedidosView(); } return; }
        
        if (state.currentView === 'cardapio') {
            const promoButton = target.closest('.btn-promo-toggle');
            if (promoButton) {
                const productId = promoButton.closest('.product-card').dataset.productId;
                openPromoModal(productId);
                return;
            }

            if (target.closest('.btn-edit-category')) { renameCategory(parseInt(target.closest('.btn-edit-category').dataset.categoryId)); return; }
            if (target.closest('.btn-toggle-visibility')) { toggleCategoryVisibility(parseInt(target.closest('.btn-toggle-visibility').dataset.categoryId)); return; }
            const optionsButton = target.closest('.options-button');
            if (optionsButton) { const menu = optionsButton.nextElementSibling; const isVisible = menu.style.display === 'block'; document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none'); menu.style.display = isVisible ? 'none' : 'block'; return; }
            if (!target.closest('.product-options')) { document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none'); }
            if (target.closest('#add-new-product-btn')) { openProductModal(); return; }
            if (target.closest('#add-new-category-btn')) { createNewCategory(); return; }
            if (target.classList.contains('edit-product-btn')) { const productId = target.dataset.productId; const product = Object.values(state.menu).flat().find(p => p.id == productId); if (product) openProductModal(product); return; }
            if (target.classList.contains('delete-product-btn')) { openConfirmModal(target.dataset.productId); return; }
        }

        if (target.closest('#cancel-modal-button') || target.closest('#close-modal-button')) { closeProductModal(); return; }
        if (target.closest('#cancel-confirm-button')) { closeConfirmModal(); return; }
        if (target.closest('#confirm-delete-button')) { deleteProduct(document.getElementById('confirm-modal-overlay').dataset.productIdToDelete); return; }

        if(target.closest('#btn-cancelar-promo-modal') || target.closest('#btn-fechar-promo-modal')) { closePromoModal(); return; }
        if(target.closest('#btn-deactivate-promo')) {
            const productId = document.getElementById('promo-product-id').value;
            if (confirm('Tem certeza que deseja desativar esta promoção?')) {
                updatePromotion(productId, false, null, null);
            }
            return;
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('availability-toggle')) { toggleProductAvailability(e.target.dataset.productId, e.target.checked); }
        if (e.target.id === 'theme-toggle') { applyTheme(e.target.checked ? 'dark' : 'light'); }
        if (e.target.id === 'product-image-file' && e.target.files && e.target.files[0]) { const reader = new FileReader(); reader.onload = function(event) { document.getElementById('image-preview').src = event.target.result; }; reader.readAsDataURL(e.target.files[0]); }
    });

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'product-form') { e.preventDefault(); saveProduct(e); }
        if (e.target.id === 'promo-form') { e.preventDefault(); savePromotion(e); }
    });

    async function init() {
        loadData(); loadTheme();
        try {
            await fetchCategoriesAndProducts();
            const response = await fetch('http://localhost:3000/api/orders');
            if (!response.ok) throw new Error('Falha ao buscar histórico de pedidos.');
            state.orders = await response.json();
            console.log('Histórico de pedidos carregado:', state.orders.length, 'pedidos encontrados.');
        } catch (error) {
            console.error("Erro na inicialização:", error);
            showNotification(error.message, "error");
        }
        renderView('dashboard');
    }

    init();
});