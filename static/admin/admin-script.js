document.addEventListener('DOMContentLoaded', () => {

    const produtosIniciais = [
        { id: 1, nome: 'Esfirra de Carne', categoria: 'Salgadas', preco: 5.50, desc: 'A clássica da casa.', detalhes: 'Carne moída, tomate, cebola, temperos especiais.', imagem: '/assets/carne.png', disponivel: true },
        { id: 2, nome: 'Esfirra de Queijo', categoria: 'Salgadas', preco: 5.00, desc: 'Queijo derretido por cima.', detalhes: 'Massa macia recheada com queijo mussarela.', imagem: '/assets/queijo.png', disponivel: true },
        { id: 3, nome: 'Marmita P', categoria: 'Marmitas', preco: 15.00, desc: 'Ideal para uma pessoa.', detalhes: 'Arroz, feijão, uma mistura do dia e salada.', imagem: '/assets/marmita.png', disponivel: true },
        { id: 4, nome: 'Marmita M', categoria: 'Marmitas', preco: 18.00, desc: 'Na medida certa para a sua fome.', detalhes: 'Arroz, feijão, duas misturas do dia e salada.', imagem: '/assets/marmita.png', disponivel: true },
        { id: 5, nome: 'Esfirra de Chocolate', categoria: 'Doces', preco: 6.50, desc: 'A melhor sobremesa.', detalhes: 'Massa macia recheada com chocolate ao leite.', imagem: '/assets/ebrigadeiro.jpg', disponivel: false },
        { id: 6, nome: 'Coca-Cola Lata', categoria: 'Bebidas', preco: 6.00, desc: 'Acompanhamento perfeito.', detalhes: 'Lata de Coca-Cola de 350ml.', imagem: '/assets/coca.png', disponivel: true },
    ];
    
    const salvarProdutosNoLocalStorage = (produtos) => {
        localStorage.setItem('zapEsfirrasProdutos', JSON.stringify(produtos));
    };

    const carregarProdutosDoLocalStorage = () => {
        const produtosJSON = localStorage.getItem('zapEsfirrasProdutos');
        return produtosJSON ? JSON.parse(produtosJSON) : null;
    };
    
    let mockProdutos = carregarProdutosDoLocalStorage();
    if (!mockProdutos) {
        mockProdutos = produtosIniciais;
        salvarProdutosNoLocalStorage(mockProdutos);
    }
    
    let mockPedidos = [
        { id: 5089, cliente: 'Edson V.', tipo: 'Entrega', itens: ['2x Esfirra de Carne', '1x Queijo'], valor: 28.50, status: 'Em preparo', timestamp: new Date(new Date().setHours(12, 15)).toISOString() },
        { id: 5088, cliente: 'Maria S.', tipo: 'Retirada', itens: ['1x Combo Família'], valor: 75.00, status: 'Novo', timestamp: new Date(new Date().setHours(12, 5)).toISOString() },
        { id: 5087, cliente: 'João P.', tipo: 'Entrega', itens: ['3x Frango c/ Catupiry'], valor: 36.00, status: 'A caminho', timestamp: new Date(new Date().setHours(11, 45)).toISOString() },
        { id: 5086, cliente: 'Carla L.', tipo: 'Retirada', itens: ['5x Esfirra de Chocolate'], valor: 40.00, status: 'Pronto', timestamp: new Date(new Date().setHours(11, 30)).toISOString() },
        { id: 5085, cliente: 'Pedro M.', tipo: 'Entrega', itens: ['1x Beirute de Calabresa'], valor: 38.00, status: 'Novo', timestamp: new Date(new Date().setHours(11, 20)).toISOString() },
        { id: 5084, cliente: 'Beatriz R.', tipo: 'Retirada', itens: ['2x Kibe Frito'], valor: 18.00, status: 'Entregue', timestamp: new Date(new Date().setHours(10, 50)).toISOString() },
        { id: 5083, cliente: 'Lucas G.', tipo: 'Entrega', itens: ['4x Esfirra de Queijo'], valor: 42.00, status: 'Em preparo', timestamp: new Date(new Date().setHours(10, 30)).toISOString() },
    ];

    const navLinks = document.querySelectorAll('.nav-link');
    const adminViews = document.querySelectorAll('.admin-view');
    const pageTitle = document.getElementById('page-title');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    const dashboardDate = document.getElementById('dashboard-date');
    const statNovosPedidos = document.getElementById('stat-novos-pedidos');
    const statFaturamento = document.getElementById('stat-faturamento');
    const statPedidosPendentes = document.getElementById('stat-pedidos-pendentes');
    const chartContainer = document.getElementById('chart-container');
    const activityFeed = document.getElementById('activity-feed');
    
    const kanbanBoard = document.querySelector('.kanban-board');
    const columnNovo = document.getElementById('column-novo');
    const columnPreparo = document.getElementById('column-preparo');
    const columnCaminho = document.getElementById('column-caminho');
    const columnPronto = document.getElementById('column-pronto');
    const countNovo = document.getElementById('count-novo');
    const countPreparo = document.getElementById('count-preparo');
    const countCaminho = document.getElementById('count-caminho');
    const countPronto = document.getElementById('count-pronto');
    
    const cardapioGrid = document.getElementById('cardapio-grid');
    const cardapioFilterBar = document.getElementById('cardapio-filter-bar');
    const btnAddProduto = document.getElementById('btn-add-produto');
    const produtoModalOverlay = document.getElementById('produto-modal-overlay');
    const produtoForm = document.getElementById('produto-form');
    const modalTitle = document.getElementById('modal-title');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal');

    const switchView = (viewName) => {
        pageTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.view === viewName));
        adminViews.forEach(view => view.classList.toggle('active', view.id === `view-${viewName}`));
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    };

    const createPedidoCardHTML = (pedido) => {
        let actionsHtml = '';
        const { status, tipo, id } = pedido;

        if (status === 'Novo') {
            actionsHtml = `<button class="action-button" data-id="${id}" data-action="preparar"><ion-icon name="restaurant-outline"></ion-icon> Iniciar Preparo</button>`;
        } else if (status === 'Em preparo') {
            if (tipo === 'Entrega') {
                actionsHtml = `<button class="action-button" data-id="${id}" data-action="despachar"><ion-icon name="bicycle-outline"></ion-icon> Despachar Pedido</button>`;
            } else {
                actionsHtml = `<button class="action-button" data-id="${id}" data-action="pronto-retirada"><ion-icon name="checkmark-done-outline"></ion-icon> Pronto p/ Retirada</button>`;
            }
        } else if (status === 'A caminho' || status === 'Pronto') {
             actionsHtml = `<button class="action-button secondary" data-id="${id}" data-action="concluir"><ion-icon name="checkmark-outline"></ion-icon> Concluir</button>`;
        } else if (status === 'Entregue') {
            actionsHtml = `<button class="action-button" disabled>Concluído</button>`;
        }

        return `
            <div class="pedido-card">
                <div class="pedido-header">
                    <span class="pedido-cliente">${pedido.cliente}</span>
                    <span class="status status-${status.toLowerCase().replace(/ /g, '-')}">${status}</span>
                </div>
                <div class="pedido-body">
                    <p><strong>ID:</strong> #${id} | <strong>Tipo:</strong> ${tipo}</p>
                    <p><strong>Itens:</strong> ${pedido.itens.join(', ')}</p>
                </div>
                <div class="pedido-actions">
                    ${actionsHtml || ''}
                </div>
            </div>
        `;
    };

    const renderPedidos = () => {
        const pedidosNovos = mockPedidos.filter(p => p.status === 'Novo');
        const pedidosEmPreparo = mockPedidos.filter(p => p.status === 'Em preparo');
        const pedidosACaminho = mockPedidos.filter(p => p.status === 'A caminho');
        const pedidosProntos = mockPedidos.filter(p => p.status === 'Pronto');

        columnNovo.innerHTML = '';
        columnPreparo.innerHTML = '';
        columnCaminho.innerHTML = '';
        columnPronto.innerHTML = '';

        countNovo.textContent = pedidosNovos.length;
        countPreparo.textContent = pedidosEmPreparo.length;
        countCaminho.textContent = pedidosACaminho.length;
        countPronto.textContent = pedidosProntos.length;

        pedidosNovos.forEach(p => columnNovo.innerHTML += createPedidoCardHTML(p));
        pedidosEmPreparo.forEach(p => columnPreparo.innerHTML += createPedidoCardHTML(p));
        pedidosACaminho.forEach(p => columnCaminho.innerHTML += createPedidoCardHTML(p));
        pedidosProntos.forEach(p => columnPronto.innerHTML += createPedidoCardHTML(p));
    };
    
    const renderCardapio = (filtroCategoria = 'Todos') => {
        cardapioGrid.innerHTML = '';
        const produtosFiltrados = (filtroCategoria === 'Todos') 
            ? mockProdutos 
            : mockProdutos.filter(p => p.categoria === filtroCategoria);

        produtosFiltrados.forEach(p => {
            const card = `
                <div class="product-card-admin">
                    <img src="${p.imagem}" alt="${p.nome}">
                    <div class="product-info">
                        <h4>${p.nome}</h4>
                        <p class="categoria">${p.categoria}</p>
                        <p class="preco">R$ ${p.preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div class="product-controls">
                        <div class="stock-toggle">
                            <span>Indisponível</span>
                            <label class="toggle-switch">
                                <input type="checkbox" class="stock-checkbox" data-id="${p.id}" ${p.disponivel ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                            <span>Disponível</span>
                        </div>
                        <div class="product-actions-admin">
                            <button class="btn-icon btn-edit" data-id="${p.id}"><ion-icon name="pencil-outline"></ion-icon></button>
                            <button class="btn-icon btn-delete delete" data-id="${p.id}"><ion-icon name="trash-outline"></ion-icon></button>
                        </div>
                    </div>
                </div>
            `;
            cardapioGrid.innerHTML += card;
        });
    };

    const popularFiltrosECategorias = () => {
        const categorias = ['Todos', ...new Set(mockProdutos.map(p => p.categoria))];
        cardapioFilterBar.innerHTML = '';
        categorias.forEach(cat => {
            const button = document.createElement('button');
            button.className = 'botao-filtro';
            button.textContent = cat;
            button.dataset.categoria = cat;
            if (cat === 'Todos') button.classList.add('active');
            cardapioFilterBar.appendChild(button);
        });

        const categoriaSelect = document.getElementById('produto-categoria');
        categoriaSelect.innerHTML = '';
        categorias.slice(1).forEach(cat => {
            categoriaSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    };

    const abrirModalProduto = (produto = null) => {
        produtoForm.reset();
        if (produto) {
            modalTitle.textContent = 'Editar Produto';
            document.getElementById('produto-id').value = produto.id;
            document.getElementById('produto-nome').value = produto.nome;
            document.getElementById('produto-categoria').value = produto.categoria;
            document.getElementById('produto-preco').value = produto.preco;
            document.getElementById('produto-descricao-curta').value = produto.desc;
            document.getElementById('produto-detalhes').value = produto.detalhes;
            document.getElementById('produto-imagem').value = produto.imagem;
        } else {
            modalTitle.textContent = 'Adicionar Novo Produto';
            document.getElementById('produto-id').value = '';
        }
        produtoModalOverlay.classList.add('active');
    };

    const fecharModalProduto = () => {
        produtoModalOverlay.classList.remove('active');
    };

    const salvarProduto = (e) => {
        e.preventDefault();
        const id = document.getElementById('produto-id').value;
        const produtoData = {
            nome: document.getElementById('produto-nome').value,
            categoria: document.getElementById('produto-categoria').value,
            preco: parseFloat(document.getElementById('produto-preco').value),
            desc: document.getElementById('produto-descricao-curta').value,
            detalhes: document.getElementById('produto-detalhes').value,
            imagem: document.getElementById('produto-imagem').value || '/assets/placeholder.png',
        };

        if (id) {
            const index = mockProdutos.findIndex(p => p.id === parseInt(id));
            mockProdutos[index] = { ...mockProdutos[index], ...produtoData };
        } else {
            const novoProduto = { id: Date.now(), disponivel: true, ...produtoData };
            mockProdutos.push(novoProduto);
        }
        
        salvarProdutosNoLocalStorage(mockProdutos);
        fecharModalProduto();
        renderCardapio();
        popularFiltrosECategorias();
    };

    const renderDashboard = () => {
        const hoje = new Date();
        dashboardDate.textContent = hoje.toLocaleDateString('pt-BR', { dateStyle: 'full' });
        const hora = hoje.getHours();
        document.querySelector('.dashboard-header h2').textContent = 
            hora < 12 ? 'Bom dia, Admin!' : hora < 18 ? 'Boa tarde, Admin!' : 'Boa noite, Admin!';

        statNovosPedidos.textContent = mockPedidos.filter(p => p.status === 'Novo').length;
        statPedidosPendentes.textContent = mockPedidos.filter(p => ['Em preparo', 'Pronto', 'A caminho'].includes(p.status)).length;
        const faturamento = mockPedidos.filter(p => p.status === 'Entregue').reduce((acc, p) => acc + p.valor, 0);
        statFaturamento.textContent = `R$ ${faturamento.toFixed(2).replace('.', ',')}`;

        const pedidosPorHora = mockPedidos.reduce((acc, p) => {
            const horaPedido = new Date(p.timestamp).getHours();
            acc[horaPedido] = (acc[horaPedido] || 0) + 1;
            return acc;
        }, {});

        chartContainer.innerHTML = '';
        const maxPedidos = Math.max(...Object.values(pedidosPorHora), 1);
        for (let i = 8; i <= 22; i++) {
            const count = pedidosPorHora[i] || 0;
            const height = (count / maxPedidos) * 100;
            const barHTML = `
                <div class="chart-bar">
                    <div class="bar" style="--bar-height: ${height}%;"></div>
                    <span class="label">${i}h</span>
                </div>
            `;
            chartContainer.innerHTML += barHTML;
        }

        activityFeed.innerHTML = '';
        mockPedidos.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5).forEach(p => {
            const icon = p.tipo === 'Entrega' ? 'bicycle-outline' : 'walk-outline';
            const itemHTML = `
                <div class="activity-item">
                    <ion-icon name="${icon}" class="icon"></ion-icon>
                    <div class="details">
                        <p><strong>${p.cliente}</strong> fez um pedido (#${p.id}).</p>
                        <p class="time">${new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                </div>
            `;
            activityFeed.innerHTML += itemHTML;
        });
    };

    const atualizarStatusPedido = (id, acao) => {
        const pedido = mockPedidos.find(p => p.id === parseInt(id));
        if (!pedido) return;
        switch (acao) {
            case 'preparar': pedido.status = 'Em preparo'; break;
            case 'despachar': pedido.status = 'A caminho'; break;
            case 'pronto-retirada': pedido.status = 'Pronto'; break;
            case 'concluir': pedido.status = 'Entregue'; break;
        }
        renderPedidos();
        renderDashboard();
    };

    // Event Listeners
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });

    kanbanBoard.addEventListener('click', (e) => {
        const button = e.target.closest('.action-button');
        if (button) {
            const { id, action } = button.dataset;
            atualizarStatusPedido(id, action);
        }
        const header = e.target.closest('.kanban-header');
        if (header) {
            header.parentElement.classList.toggle('collapsed');
        }
    });

    cardapioFilterBar.addEventListener('click', (e) => {
        if (e.target.classList.contains('botao-filtro')) {
            cardapioFilterBar.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            renderCardapio(e.target.dataset.categoria);
        }
    });

    btnAddProduto.addEventListener('click', () => abrirModalProduto());

    cardapioGrid.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.btn-edit')) {
            const id = parseInt(target.closest('.btn-edit').dataset.id);
            const produto = mockProdutos.find(p => p.id === id);
            abrirModalProduto(produto);
        }
        if (target.closest('.btn-delete')) {
            const id = parseInt(target.closest('.btn-delete').dataset.id);
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                mockProdutos = mockProdutos.filter(p => p.id !== id);
                salvarProdutosNoLocalStorage(mockProdutos);
                renderCardapio();
            }
        }
        if (target.classList.contains('stock-checkbox')) {
            const id = parseInt(target.dataset.id);
            const produto = mockProdutos.find(p => p.id === id);
            produto.disponivel = target.checked;
            salvarProdutosNoLocalStorage(mockProdutos);
        }
    });

    produtoForm.addEventListener('submit', salvarProduto);
    btnCancelarModal.addEventListener('click', fecharModalProduto);
    btnCloseModal.addEventListener('click', fecharModalProduto);
    produtoModalOverlay.addEventListener('click', (e) => {
        if (e.target === produtoModalOverlay) fecharModalProduto();
    });

    const init = () => {
        renderDashboard();
        renderPedidos();
        renderCardapio();
        popularFiltrosECategorias();
        switchView('dashboard');
    };

    init();
});