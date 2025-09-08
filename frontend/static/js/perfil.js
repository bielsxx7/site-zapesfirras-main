document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO DA APLICAÇÃO ---
    let state = {
        userData: {},
        userAddresses: []
    };

    // --- SELETORES DE ELEMENTOS ---
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const nomeUsuarioDesktop = document.getElementById('nome-usuario-desktop');
    const perfilNav = document.querySelector('.perfil-nav');
    const perfilSecoes = document.querySelectorAll('.perfil-secao');
    const listaEnderecosContainer = document.getElementById('lista-enderecos-container');

    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    /**
     * Renderiza a lista de endereços do cliente na tela.
     */
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

    // --- FUNÇÕES DE API ---

    /**
     * Busca os dados iniciais do cliente (perfil e endereços).
     */
    async function loadInitialData() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const [addressesResponse, userDataResponse] = await Promise.all([
                fetch('http://localhost:3000/api/customers/me/addresses', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:3000/api/customers/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!addressesResponse.ok || !userDataResponse.ok) {
                throw new Error('Falha ao buscar dados do perfil.');
            }

            state.userAddresses = await addressesResponse.json();
            state.userData = await userDataResponse.json();

            // Renderiza os dados na tela
            renderAddresses();
            // futuramente: renderUserData();

        } catch (error) {
            console.error(error);
            // Tratar erro, talvez mostrar uma mensagem para o usuário.
        }
    }

    /**
     * Exclui um endereço específico.
     * @param {number} addressId O ID do endereço a ser excluído.
     */
    async function deleteAddress(addressId) {
        if (!confirm('Tem certeza que deseja excluir este endereço?')) {
            return;
        }

        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:3000/api/customers/me/addresses/${addressId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Não foi possível excluir o endereço.');
            }

            // Atualiza a lista de endereços na tela
            await loadInitialData();
            alert('Endereço excluído com sucesso!');

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }


    // --- EVENT LISTENERS ---

    function setupEventListeners() {
        // Navegação entre as abas do perfil
        if (perfilNav) {
            perfilNav.addEventListener('click', (e) => {
                const link = e.target.closest('.perfil-nav-link');
                if (!link) return;

                e.preventDefault();

                // Lógica para logout
                if (link.id === 'link-logout') {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('customerInfo');
                    window.location.href = 'index.html';
                    return;
                }

                // Troca de abas
                perfilNav.querySelector('.active')?.classList.remove('active');
                link.classList.add('active');

                perfilSecoes.forEach(secao => secao.classList.remove('active'));
                const targetId = `secao-${link.dataset.target}`;
                document.getElementById(targetId)?.classList.add('active');
            });
        }

        // Delegação de eventos para os botões nos cards de endereço
        if (listaEnderecosContainer) {
            listaEnderecosContainer.addEventListener('click', (e) => {
                const deleteButton = e.target.closest('.btn-delete-address');
                if (deleteButton) {
                    const card = deleteButton.closest('.endereco-card');
                    const addressId = card.dataset.addressId;
                    deleteAddress(addressId);
                }
                
                // Adicionar lógica para o botão de editar aqui no futuro
                const editButton = e.target.closest('.btn-edit-address');
                if (editButton) {
                    alert('Funcionalidade de editar endereço em breve!');
                }
            });
        }
        
        // Botão para adicionar novo endereço
        const btnNovoEndereco = document.getElementById('btn-novo-endereco');
        if (btnNovoEndereco) {
            btnNovoEndereco.addEventListener('click', () => {
                alert('Funcionalidade de adicionar novo endereço em breve!');
                // Aqui abriremos um modal com o formulário de endereço no futuro.
            });
        }
        
        // Botão de logout no header desktop
        const logoutButtonDesktop = document.getElementById('botao-logout-desktop');
        if (logoutButtonDesktop) {
            logoutButtonDesktop.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('customerInfo');
                window.location.href = 'index.html';
            });
        }
    }

    /**
     * Função principal de inicialização da página.
     */
    async function init() {
        // Passo 1: Segurança - Verificar se o usuário está logado
        const token = localStorage.getItem('authToken');
        const customerInfo = JSON.parse(localStorage.getItem('customerInfo'));

        if (!token || !customerInfo) {
            // Se não estiver logado, redireciona para a página de login
            window.location.href = 'login-cliente.html';
            return; // Interrompe a execução do script
        }
        
        // Atualiza o nome do usuário no cabeçalho
        if (nomeUsuarioDesktop && customerInfo.name) {
            nomeUsuarioDesktop.textContent = `Olá, ${customerInfo.name.split(' ')[0]}!`;
        }

        // Mostra o conteúdo e esconde o carregamento
        if (telaCarregamento) telaCarregamento.style.display = 'flex';
        if (conteudoPrincipal) conteudoPrincipal.style.display = 'none';

        // Carrega os dados da API
        await loadInitialData();

        // Configura todos os eventos da página
        setupEventListeners();

        // Efeito de fade-in no conteúdo
        setTimeout(() => {
            if (telaCarregamento) telaCarregamento.style.display = 'none';
            if (conteudoPrincipal) conteudoPrincipal.style.display = 'block';
        }, 300);
    }

    init();
});