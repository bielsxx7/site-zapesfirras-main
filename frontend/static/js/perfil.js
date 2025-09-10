document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO DA APLICAÇÃO ---
    let state = {
        userData: {},
        userAddresses: [],
        carrinho: []
    };

    // --- SELETORES DE ELEMENTOS ---
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const nomeUsuarioDesktop = document.getElementById('nome-usuario-desktop');
    const perfilNav = document.querySelector('.perfil-nav');
    const perfilSecoes = document.querySelectorAll('.perfil-secao');
    const listaEnderecosContainer = document.getElementById('lista-enderecos-container');
    
    // =======================================================
    // --- NOVA FUNÇÃO PARA RENDERIZAR ZAPCLUBE ---
    // =======================================================
    async function renderZapClubeView() {
        const container = document.getElementById('secao-zapclube');
        if (!container) return;
    
        const customerPoints = state.userData.points || 0;
    
        container.innerHTML = `
            <div class="secao-header">
                <h2>ZapClube Fidelidade</h2>
            </div>
            <div class="zapclube-summary">
                <p>Você tem</p>
                <div class="points-balance">${customerPoints}<span> pontos</span></div>
                <p>Continue pedindo para juntar mais e trocar por prêmios!</p>
            </div>
            <h3>Recompensas Disponíveis</h3>
            <div id="rewards-list-container">Carregando recompensas...</div>
        `;
    
        try {
            const response = await fetch('http://localhost:3000/api/rewards');
            if (!response.ok) throw new Error('Falha ao buscar recompensas');
            const rewards = await response.json();
            const rewardsContainer = document.getElementById('rewards-list-container');
            
            if (rewards.length > 0) {
                rewardsContainer.innerHTML = rewards.map(reward => `
                    <div class="reward-card-cliente ${customerPoints >= reward.points_cost ? 'unlocked' : 'locked'}">
                        <div class="reward-info">
                            <h4>${reward.name}</h4>
                            <p>${reward.description}</p>
                        </div>
                        <div class="reward-cost">
                            <span>${reward.points_cost} Pts</span>
                            <button class="btn btn-primary btn-resgatar" data-reward-id="${reward.id}" ${customerPoints >= reward.points_cost ? '' : 'disabled'}>
                                ${customerPoints >= reward.points_cost ? 'Resgatar' : `Faltam ${reward.points_cost - customerPoints}`}
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                rewardsContainer.innerHTML = '<p>Nenhuma recompensa disponível no momento.</p>';
            }
        } catch (error) {
            console.error(error);
            document.getElementById('rewards-list-container').innerHTML = '<p>Não foi possível carregar as recompensas.</p>';
        }
    }

    // =======================================================
    // --- LÓGICA DA PÁGINA DE PERFIL ---
    // =======================================================
    
    function renderAddresses() {
        if (!listaEnderecosContainer) return;
        if (state.userAddresses.length === 0) {
            listaEnderecosContainer.innerHTML = '<p>Nenhum endereço cadastrado ainda. Clique em "Adicionar Endereço" para começar.</p>';
            return;
        }
        listaEnderecosContainer.innerHTML = state.userAddresses.map(address => `
            <div class="endereco-card" data-address-id="${address.id}">
                <div class="endereco-card-header">
                    <div class="endereco-card-alias">
                        <ion-icon name="home-outline"></ion-icon>
                        ${address.alias}
                        ${address.is_default ? '<span class="default-badge">Padrão</span>' : ''}
                    </div>
                    <div class="endereco-card-actions">
                        <button class="btn-card-action btn-edit-address" title="Editar Endereço">
                            <ion-icon name="pencil-outline"></ion-icon>
                        </button>
                        <button class="btn-card-action btn-delete-address" title="Excluir Endereço">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
                <div class="endereco-card-body">
                    <p>${address.street}, ${address.number}</p>
                    <p>${address.neighborhood}, CEP: ${address.cep}</p>
                    ${address.complement ? `<p>Complemento: ${address.complement}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    async function loadInitialData() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login-cliente.html';
            return;
        }
        try {
            const [addressesResponse, userDataResponse] = await Promise.all([
                fetch('http://localhost:3000/api/customers/me/addresses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:3000/api/customers/me', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!addressesResponse.ok || !userDataResponse.ok) throw new Error('Falha ao buscar dados do perfil.');
            
            state.userAddresses = await addressesResponse.json();
            state.userData = await userDataResponse.json();
            
            renderAddresses();
            await renderZapClubeView();
            
        } catch (error) {
            console.error(error);
            // Poderia adicionar uma mensagem de erro na tela
        }
    }

    function setupEventListeners() {
        if (perfilNav) {
            perfilNav.addEventListener('click', (e) => {
                const link = e.target.closest('.perfil-nav-link');
                if (!link) return;
                e.preventDefault();

                if (link.id === 'link-logout') {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('customerInfo');
                    window.location.href = 'index.html';
                    return;
                }

                perfilNav.querySelector('.active')?.classList.remove('active');
                link.classList.add('active');
                
                perfilSecoes.forEach(secao => secao.classList.remove('active'));
                const targetId = `secao-${link.dataset.target}`;
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        }
        
        // Listener para resgatar recompensa (exemplo)
        const conteudo = document.querySelector('.perfil-conteudo');
        if(conteudo) {
            conteudo.addEventListener('click', (e) => {
                const resgatarBtn = e.target.closest('.btn-resgatar');
                if(resgatarBtn) {
                    alert('A função de resgate de prêmios será implementada no carrinho de compras!');
                    return;
                }
            });
        }
    }

    async function init() {
        const token = localStorage.getItem('authToken');
        const customerInfo = JSON.parse(localStorage.getItem('customerInfo'));
        if (!token || !customerInfo) {
            window.location.href = 'login-cliente.html';
            return;
        }
        if (nomeUsuarioDesktop && customerInfo.name) {
            nomeUsuarioDesktop.textContent = `Olá, ${customerInfo.name.split(' ')[0]}!`;
        }

        if (telaCarregamento) telaCarregamento.style.display = 'flex';
        if (conteudoPrincipal) conteudoPrincipal.style.display = 'none';
        
        await loadInitialData();
        setupEventListeners();

        setTimeout(() => {
            if (telaCarregamento) telaCarregamento.style.display = 'none';
            if (conteudoPrincipal) conteudoPrincipal.style.display = 'block';
        }, 300);
    }

    init();
});