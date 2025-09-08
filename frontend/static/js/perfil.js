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
    // Seletores do Perfil
    const perfilNav = document.querySelector('.perfil-nav');
    const perfilSecoes = document.querySelectorAll('.perfil-secao');
    const listaEnderecosContainer = document.getElementById('lista-enderecos-container');
    const enderecoModal = document.getElementById('endereco-modal-overlay');
    const enderecoForm = document.getElementById('form-endereco');
    // Seletores do Carrinho (Adicionados)
    const painelCarrinho = document.getElementById('painel-carrinho');
    const sobreposicaoCarrinho = document.getElementById('sobreposicao-carrinho');
    const contadorCarrinhoMobileEl = document.getElementById('contador-carrinho-mobile');
    const contadorCarrinhoDesktopEl = document.getElementById('contador-carrinho-desktop');
    const btnCarrinhoMobile = document.getElementById('botao-carrinho-mobile');
    const btnCarrinhoDesktop = document.getElementById('botao-carrinho-desktop');


    // =======================================================
    // --- LÓGICA DO CARRINHO (ADICIONADA) ---
    // =======================================================

    const salvarCarrinhoLocalStorage = () => localStorage.setItem('carrinhoZapEsfirras', JSON.stringify(state.carrinho));
    const carregarCarrinhoLocalStorage = () => {
        state.carrinho = JSON.parse(localStorage.getItem('carrinhoZapEsfirras')) || [];
        renderizarItensCarrinho();
    };

    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    function atualizarContadoresCarrinho() {
        const totalItens = state.carrinho.reduce((acc, item) => acc + item.quantity, 0);
        if (contadorCarrinhoMobileEl) {
            contadorCarrinhoMobileEl.textContent = totalItens;
            contadorCarrinhoMobileEl.classList.toggle('ativo', totalItens > 0);
        }
        if (contadorCarrinhoDesktopEl) {
            contadorCarrinhoDesktopEl.textContent = totalItens;
            contadorCarrinhoDesktopEl.classList.toggle('ativo', totalItens > 0);
        }
    }

    function renderizarItensCarrinho() {
        const container = document.getElementById('lista-itens-carrinho');
        if (!container) return;

        if (state.carrinho.length === 0) {
            container.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>';
        } else {
            container.innerHTML = state.carrinho.map(item => `
                <div class="item-carrinho-novo" data-id-unico="${item.idUnico}">
                    <div class="info-item">
                        <p class="nome-item">${item.name}</p>
                        <span class="preco-unitario-item">${formatCurrency(item.price)} x ${item.quantity}</span>
                    </div>
                    <div class="acoes-item">
                        <span>${formatCurrency(item.price * item.quantity)}</span>
                    </div>
                </div>
            `).join('');
        }
        atualizarContadoresCarrinho();
    }

    const togglePainelCarrinho = (abrir = null) => {
        if (!painelCarrinho) return;
        const ativo = abrir === null ? !painelCarrinho.classList.contains('ativo') : abrir;
        painelCarrinho.classList.toggle('ativo', ativo);
        if (sobreposicaoCarrinho) {
            sobreposicaoCarrinho.classList.toggle('ativo', ativo);
        }
    };


    // =======================================================
    // --- LÓGICA DA PÁGINA DE PERFIL ---
    // =======================================================
    
    function ajustarPaddingCorpo() {
        const headerNav = document.querySelector('.barra-navegacao');
        const topInfoBar = document.querySelector('.barra-superior-info');
        const mainContent = document.querySelector('.container-principal');

        if (!mainContent || !headerNav) return;

        let totalHeaderHeight = 0;
        totalHeaderHeight += headerNav.offsetHeight;
        if (topInfoBar && topInfoBar.offsetHeight > 0) {
            totalHeaderHeight += topInfoBar.offsetHeight;
        }
        mainContent.style.paddingTop = `${totalHeaderHeight + 20}px`;
    }

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

    function openEnderecoModal() {
        if (!enderecoModal) return;
        enderecoForm.reset();
        document.getElementById('endereco-modal-title').textContent = "Adicionar Novo Endereço";
        enderecoModal.classList.add('visible');
    }

    function closeEnderecoModal() {
        if (!enderecoModal) return;
        enderecoModal.classList.remove('visible');
    }

    async function loadInitialData() {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const [addressesResponse, userDataResponse] = await Promise.all([
                fetch('http://localhost:3000/api/customers/me/addresses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:3000/api/customers/me', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!addressesResponse.ok || !userDataResponse.ok) throw new Error('Falha ao buscar dados do perfil.');
            state.userAddresses = await addressesResponse.json();
            state.userData = await userDataResponse.json();
            renderAddresses();
        } catch (error) {
            console.error(error);
        }
    }

    async function deleteAddress(addressId) {
        if (!confirm('Tem certeza que deseja excluir este endereço?')) return;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:3000/api/customers/me/addresses/${addressId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Não foi possível excluir o endereço.');
            await loadInitialData();
            alert('Endereço excluído com sucesso!');
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    async function saveAddress(e) {
        e.preventDefault();
        const token = localStorage.getItem('authToken');
        const addressData = {
            alias: document.getElementById('endereco-alias').value,
            cep: document.getElementById('endereco-cep').value,
            street: document.getElementById('endereco-rua').value,
            number: document.getElementById('endereco-numero').value,
            neighborhood: document.getElementById('endereco-bairro').value,
            complement: document.getElementById('endereco-complemento').value,
            reference: document.getElementById('endereco-referencia').value,
        };
        try {
            const response = await fetch('http://localhost:3000/api/customers/me/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar endereço.');
            }
            closeEnderecoModal();
            await loadInitialData();
            alert('Endereço salvo com sucesso!');
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }
    
    async function buscarEnderecoPorCEP(cep) {
        const inputRua = document.getElementById('endereco-rua');
        const inputBairro = document.getElementById('endereco-bairro');
        const inputNumero = document.getElementById('endereco-numero');
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep.replace(/\D/g, '')}`);
            if (!response.ok) throw new Error('CEP não encontrado.');
            const data = await response.json();
            inputRua.value = data.street;
            inputBairro.value = data.neighborhood;
            inputRua.readOnly = false;
            inputBairro.readOnly = false;
            inputNumero.focus();
        } catch (error) {
            alert(error.message);
        }
    }

    function setupEventListeners() {
        window.addEventListener('resize', ajustarPaddingCorpo);

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
                document.getElementById(targetId)?.classList.add('active');
            });
        }

        if (listaEnderecosContainer) {
            listaEnderecosContainer.addEventListener('click', (e) => {
                const deleteButton = e.target.closest('.btn-delete-address');
                if (deleteButton) {
                    const card = deleteButton.closest('.endereco-card');
                    const addressId = card.dataset.addressId;
                    deleteAddress(addressId);
                }
                const editButton = e.target.closest('.btn-edit-address');
                if (editButton) {
                    alert('Funcionalidade de editar endereço em breve!');
                }
            });
        }
        
        document.getElementById('btn-novo-endereco')?.addEventListener('click', openEnderecoModal);
        document.getElementById('btn-fechar-modal-endereco')?.addEventListener('click', closeEnderecoModal);
        document.getElementById('btn-cancelar-modal-endereco')?.addEventListener('click', closeEnderecoModal);
        document.getElementById('endereco-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeEnderecoModal();
        });
        
        const logoutButtonDesktop = document.getElementById('botao-logout-desktop');
        if (logoutButtonDesktop) {
            logoutButtonDesktop.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('customerInfo');
                window.location.href = 'index.html';
            });
        }

        enderecoForm?.addEventListener('submit', saveAddress);

        const inputCEP = document.getElementById('endereco-cep');
        if(inputCEP) {
            inputCEP.addEventListener('input', (e) => {
                let cep = e.target.value.replace(/\D/g, '');
                if (cep.length > 5) {
                    cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
                }
                e.target.value = cep;
                if (cep.length === 9) {
                    buscarEnderecoPorCEP(cep);
                }
            });
        }
        
        // Listeners do Carrinho (Adicionados)
        btnCarrinhoMobile?.addEventListener('click', () => togglePainelCarrinho(true));
        btnCarrinhoDesktop?.addEventListener('click', () => togglePainelCarrinho(true));
        document.getElementById('botao-fechar-painel-novo')?.addEventListener('click', () => togglePainelCarrinho(false));
        sobreposicaoCarrinho?.addEventListener('click', () => togglePainelCarrinho(false));
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
        
        // Carrega tanto os dados do carrinho quanto do perfil
        carregarCarrinhoLocalStorage();
        await loadInitialData();
        
        setupEventListeners();

        setTimeout(() => {
            if (telaCarregamento) telaCarregamento.style.display = 'none';
            if (conteudoPrincipal) conteudoPrincipal.style.display = 'block';
            ajustarPaddingCorpo();
        }, 300);
    }

    init();
});