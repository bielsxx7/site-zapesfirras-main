document.addEventListener('DOMContentLoaded', () => {

    const socket = io('http://localhost:3000');

    socket.on('menu_updated', () => {
        mostrarNotificacao('O cardápio foi atualizado!');
        carregarDadosDaAPI();
    });

    // --- STATE MANAGEMENT ---
    let carrinho = [];
    let taxaDeEntrega = 5.00;
    const metaEntregaGratis = 100.00;
    let produtoAtualModal = {};
    let timeoutNotificacao;
    let etapaAtualCarrinho = 'itens';
    let cupomAplicado = null;
    let pedido = {
        metodoEntrega: 'padrao',
        pagamento: { metodo: 'Cartão', tipo: 'Crédito', trocoPara: 0 }
    };
    let menuData = {};
    let activeTimers = []; // NOVO: Array para controlar os timers ativos

    const adicionaisPorCategoria = {
        'Esfirras Salgadas': [{ name: 'Bacon', price: 3.50 }, { name: 'Catupiry Extra', price: 3.00 }, { name: 'Cheddar', price: 3.00 }, { name: 'Alho Frito', price: 2.00 }],
        'Beirutes': [{ name: 'Ovo', price: 2.50 }, { name: 'Bacon', price: 4.00 }, { name: 'Catupiry', price: 3.50 }, { name: 'Dobro de Queijo', price: 5.00 }],
        'Lanches': [{ name: 'Ovo', price: 2.50 }, { name: 'Bacon', price: 4.00 }, { name: 'Cheddar', price: 3.00 }, { name: 'Hambúrguer Extra', price: 6.00 }],
        'default': [{ name: 'Bacon', price: 3.50 }, { name: 'Cheddar', price: 3.00 }, { name: 'Catupiry', price: 3.00 },]
    };

    // --- SELETORES DE ELEMENTOS ---
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const sobreposicaoModal = document.getElementById('modal-sobreposicao');
    const notificacao = document.getElementById('notificacao');
    const textoNotificacao = document.getElementById('texto-notificacao');
    const painelCarrinho = document.getElementById('painel-carrinho');
    const sobreposicaoCarrinho = document.getElementById('sobreposicao-carrinho');
    const tituloCarrinho = document.getElementById('titulo-carrinho');
    const btnVoltarCarrinho = document.getElementById('btn-voltar-carrinho');
    const btnContinuarCarrinho = document.getElementById('btn-continuar-carrinho');
    const telasCarrinho = document.querySelectorAll('.tela-carrinho');
    const todasEntradasPesquisa = document.querySelectorAll('.texto-pesquisa');
    const mensagemSemResultados = document.getElementById('sem-resultados');
    const barraFiltros = document.querySelector('.barra-filtros');
    const btnScrollLeft = document.getElementById('scroll-left');
    const btnScrollRight = document.getElementById('scroll-right');
    const btnCarrinhoMobile = document.getElementById('botao-carrinho-mobile');
    const contadorCarrinhoMobileEl = document.getElementById('contador-carrinho-mobile');
    const btnCarrinhoDesktop = document.getElementById('botao-carrinho-desktop');
    const contadorCarrinhoDesktopEl = document.getElementById('contador-carrinho-desktop');
    const toggleAdicionaisBtn = document.getElementById('toggle-adicionais');
    const listaAdicionaisContainer = document.getElementById('lista-adicionais');
    const formEndereco = document.getElementById('form-endereco');
    const formRetirada = document.getElementById('form-retirada');
    let todosCartoesProduto = [];
    let secoesProdutos = [];


    // --- NOVA FUNÇÃO PARA INICIAR E GERENCIAR CRONÔMETROS ---
    function iniciarContadoresDePromocao() {
        // 1. Limpa timers antigos para evitar acúmulo
        activeTimers.forEach(timerId => clearInterval(timerId));
        activeTimers = [];

        // 2. Encontra todos os elementos de cronômetro na tela
        const countdownElements = document.querySelectorAll('.promo-countdown');

        countdownElements.forEach(element => {
            const expirationDate = new Date(element.dataset.expiresAt);

            const timerId = setInterval(() => {
                const now = new Date();
                const timeLeft = expirationDate - now;

                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    // 3. QUANDO O TEMPO ACABA, RECARREGA O CARDÁPIO!
                    console.log("Promoção expirada! Recarregando cardápio...");
                    mostrarNotificacao("Uma oferta relâmpago acabou!");
                    carregarDadosDaAPI();
                    return;
                }

                const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
                const minutes = Math.floor((timeLeft / 1000 / 60) % 60).toString().padStart(2, '0');
                const seconds = Math.floor((timeLeft / 1000) % 60).toString().padStart(2, '0');

                element.innerHTML = `Termina em: <b>${hours}:${minutes}:${seconds}</b>`;
            }, 1000);

            activeTimers.push(timerId); // Guarda a referência do timer para poder limpá-lo depois
        });
    }

    // --- FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ---
    async function carregarDadosDaAPI() {
        try {
            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch('http://localhost:3000/api/categories'),
                fetch('http://localhost:3000/api/products')
            ]);
            if (!categoriesResponse.ok) throw new Error('Erro ao buscar categorias.');
            if (!productsResponse.ok) throw new Error('Erro de rede ao buscar produtos.');
            
            const categoriasVisiveis = await categoriesResponse.json();
            const todosProdutos = await productsResponse.json();
            
            if (barraFiltros) renderizarFiltros(categoriasVisiveis);
            const produtosVisiveis = todosProdutos.filter(p => p.available && p.category_is_visible);
            
            const secaoPromocoes = document.getElementById('secao-promocoes-relampago');
            const gradePromocoes = document.getElementById('grade-promocoes');
            const produtosEmPromocao = produtosVisiveis.filter(p => p.is_on_promo == 1 && p.promo_price > 0 && new Date(p.promo_expires_at) > new Date());

            if (secaoPromocoes && gradePromocoes) {
                if (produtosEmPromocao.length > 0) {
                    gradePromocoes.innerHTML = produtosEmPromocao.map(produto => criarCardProdutoHTML(produto)).join('');
                    secaoPromocoes.style.display = 'block';
                } else {
                    secaoPromocoes.style.display = 'none';
                    gradePromocoes.innerHTML = '';
                }
            }
            
            menuData = produtosVisiveis.reduce((acc, produto) => {
                const categoria = produto.category_name;
                if (!acc[categoria]) acc[categoria] = [];
                acc[categoria].push(produto);
                return acc;
            }, {});

            const containerPrincipal = document.querySelector('main.container-principal');
            if (containerPrincipal) {
                const secoesAntigas = containerPrincipal.querySelectorAll('.container-secao[data-category]');
                secoesAntigas.forEach(secao => secao.remove());
                
                categoriasVisiveis.forEach(categoria => {
                    const produtosDaCategoria = menuData[categoria.name];
                    if (produtosDaCategoria && produtosDaCategoria.length > 0) {
                        const secaoHTML = `
                            <section class="container-secao" data-category="${categoria.name}">
                                <h2 class="titulo-secao">${categoria.name}</h2>
                                <div class="grade-produtos">
                                    ${produtosDaCategoria.map(produto => criarCardProdutoHTML(produto)).join('')}
                                </div>
                            </section>`;
                        containerPrincipal.insertAdjacentHTML('beforeend', secaoHTML);
                    }
                });
                todosCartoesProduto = document.querySelectorAll('.cartao-produto');
                secoesProdutos = document.querySelectorAll('.container-secao[data-category]');
            }
            renderizarSugestoes();
            gerenciarSetasScroll();

            iniciarContadoresDePromocao();

        } catch (error) {
            console.error("Falha ao carregar cardápio:", error);
            const containerPrincipal = document.querySelector('main.container-principal');
            if (containerPrincipal) {
                containerPrincipal.innerHTML = '<p class="mensagem-erro-api">Não foi possível carregar o cardápio. Verifique se o servidor está rodando e tente novamente.</p>';
            }
        }
    }

    function renderizarFiltros(categorias) {
        if (!barraFiltros) return;
        barraFiltros.innerHTML = '<button class="botao-filtro ativo" data-categoria="Todos">Todos</button>';
        categorias.forEach(categoria => {
            barraFiltros.insertAdjacentHTML('beforeend', `<button class="botao-filtro" data-categoria="${categoria.name}">${categoria.name}</button>`);
        });
    }

    const formatCurrency = (value) => (value != null ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00');

    function criarCardProdutoHTML(produto) {
        const isPromo = produto.is_on_promo == 1 && produto.promo_price > 0 && new Date(produto.promo_expires_at) > new Date();
    
        const priceHTML = isPromo
            ? `
                <span class="preco-antigo"><s>${formatCurrency(produto.price)}</s></span>
                <span class="preco-promocional">${formatCurrency(produto.promo_price)}</span>
            `
            : `<span class="preco">${formatCurrency(produto.price)}</span>`;
    
        return `
        <div class="cartao-produto ${isPromo ? 'em-promocao' : ''}" data-id="${produto.id}" data-category="${produto.category_name}">
            ${isPromo ? '<div class="promo-badge-estilizado">⚡ OFERTA RELÂMPAGO</div>' : ''}
            <div class="container-detalhes-produto">
                <img src="${produto.image}" alt="${produto.name}">
                <div class="texto-info-produto">
                    <h3>${produto.name}</h3>
                    <h4>${produto.description || ''}</h4>
                    ${isPromo ? `<div class="promo-countdown" data-expires-at="${produto.promo_expires_at}"></div>` : ''}
                </div>
            </div>
            <div class="acoes-produto">
                <div class="precos-container">
                    ${priceHTML}
                </div>
                <button class="botao-adicionar"><ion-icon name="add-outline"></ion-icon></button>
            </div>
        </div>`;
    }

    function renderizarSugestoes() {
        const container = document.querySelector('.carrossel-sugestoes');
        if (!container) return;
        const bebidas = [...(menuData['Refrigerantes'] || []), ...(menuData['Sucos'] || []), ...(menuData['Chope/Cervejas'] || [])];
        const sugestoes = bebidas.sort(() => 0.5 - Math.random()).slice(0, 3);
        container.innerHTML = '';
        sugestoes.forEach(item => {
            container.insertAdjacentHTML('beforeend', `<div class="item-sugestao" data-id="${item.id}" data-category="${item.category_name}"><p>${item.name}</p><span>${(parseFloat(item.price)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><button class="botao-add-sugestao">+</button></div>`);
        });
    }

    function atualizarInfoCabecalho() {
        const greetingEl = document.getElementById('greeting');
        const dateEl = document.getElementById('current-date');
        const mobileGreetingContainer = document.getElementById('header-greeting-mobile');
        if (!greetingEl || !dateEl) return;
        const agora = new Date();
        const hora = agora.getHours();
        let saudacao;
        if (hora >= 5 && hora < 12) {
            saudacao = 'Bom dia!';
        } else if (hora >= 12 && hora < 18) {
            saudacao = 'Boa tarde!';
        } else {
            saudacao = 'Boa noite!';
        }
        const opcoesData = { weekday: 'long', month: 'long', day: 'numeric' };
        let dataFormatada = agora.toLocaleDateString('pt-BR', opcoesData);
        dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
        greetingEl.textContent = saudacao;
        dateEl.textContent = dataFormatada;
        if (mobileGreetingContainer) {
            mobileGreetingContainer.innerHTML = `<span>${saudacao}</span> &#8226; <span>${dataFormatada}</span>`;
        }
    }
    
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
    
    function filtrarEBuscarProdutos(termo) {
        if (!todosCartoesProduto) return;
        let produtoEncontrado = false;
        todosCartoesProduto.forEach(cartao => {
            const nomeProduto = cartao.querySelector('h3').textContent.toLowerCase();
            const deveMostrar = nomeProduto.includes(termo);
            cartao.style.display = deveMostrar ? 'flex' : 'none';
            if (deveMostrar) produtoEncontrado = true;
        });
        secoesProdutos.forEach(secao => {
            const produtosVisiveis = secao.querySelectorAll('.cartao-produto[style*="display: flex"]').length;
            secao.style.display = produtosVisiveis > 0 || termo === '' ? 'block' : 'none';
        });
        if (mensagemSemResultados) {
            mensagemSemResultados.style.display = !produtoEncontrado && termo !== '' ? 'block' : 'none';
        }
    }

    function filtrarPorCategoria(categoriaAlvo) {
        if (!secoesProdutos) return;
        secoesProdutos.forEach(secao => {
            const categoriaDaSecao = secao.dataset.category;
            secao.style.display = (categoriaAlvo === 'Todos' || categoriaDaSecao === categoriaAlvo) ? 'block' : 'none';
        });
        todasEntradasPesquisa.forEach(input => input.value = '');
        if (mensagemSemResultados) mensagemSemResultados.style.display = 'none';
    }

    function mostrarNotificacao(mensagem, type = '') {
        if (!notificacao || !textoNotificacao) return;
        clearTimeout(timeoutNotificacao);
        notificacao.classList.remove('success', 'error');
        if (type) {
            notificacao.classList.add(type);
        }
        textoNotificacao.textContent = mensagem;
        notificacao.classList.add('mostrar');
        timeoutNotificacao = setTimeout(() => notificacao.classList.remove('mostrar'), 2500);
    }

    function gerenciarSetasScroll() {
        if (!barraFiltros || !btnScrollLeft || !btnScrollRight) return;
        const temScroll = barraFiltros.scrollWidth > barraFiltros.clientWidth;
        if (!temScroll) {
            btnScrollLeft.classList.remove('visivel');
            btnScrollRight.classList.remove('visivel');
            return;
        }
        btnScrollLeft.classList.toggle('visivel', barraFiltros.scrollLeft > 0);
        const maxScrollLeft = barraFiltros.scrollWidth - barraFiltros.clientWidth;
        btnScrollRight.classList.toggle('visivel', barraFiltros.scrollLeft < maxScrollLeft - 1);
    }

    function popularAdicionais(produto) {
        if (!listaAdicionaisContainer || !toggleAdicionaisBtn) return;
        const categoria = produto.category_name || 'default';
        const adicionaisDisponiveis = adicionaisPorCategoria[categoria] || adicionaisPorCategoria['default'];
        if (!adicionaisDisponiveis || adicionaisDisponiveis.length === 0) {
            toggleAdicionaisBtn.style.display = 'none';
            listaAdicionaisContainer.innerHTML = '';
            return;
        }
        toggleAdicionaisBtn.style.display = 'flex';
        listaAdicionaisContainer.innerHTML = '';
        adicionaisDisponiveis.forEach(adicional => {
            const adicionalHTML = `
                <div class="item-adicional">
                    <label>
                        <input type="checkbox" class="checkbox-adicional" data-nome="${adicional.name}" data-preco="${adicional.price}">
                        <span class="checkmark-adicional"></span>
                        <span class="nome-adicional">${adicional.name}</span>
                    </label>
                    <span class="preco-adicional">+ ${formatCurrency(adicional.price)}</span>
                </div>
            `;
            listaAdicionaisContainer.insertAdjacentHTML('beforeend', adicionalHTML);
        });
    }

    function atualizarPrecoTotalModal() {
        const quantidadeInput = document.querySelector('.modal-produto .entrada-quantidade');
        const botaoAdicionar = document.querySelector('.botao-adicionar-carrinho-modal');
        if (!quantidadeInput || !botaoAdicionar || !produtoAtualModal) return;
        const quantidade = parseInt(quantidadeInput.value);
        let precoTotalAdicionais = 0;
        document.querySelectorAll('.checkbox-adicional:checked').forEach(checkbox => {
            precoTotalAdicionais += parseFloat(checkbox.dataset.preco);
        });
        const precoBase = parseFloat(produtoAtualModal.precoBase) || 0;
        const precoFinal = (precoBase + precoTotalAdicionais) * quantidade;
        produtoAtualModal.precoFinal = precoFinal / quantidade;
        botaoAdicionar.textContent = `Adicionar ${formatCurrency(precoFinal)}`;
    }

    // --- LÓGICA DO CARRINHO ---
    const salvarCarrinhoLocalStorage = () => localStorage.setItem('carrinhoZapEsfirras', JSON.stringify(carrinho));
    const carregarCarrinhoLocalStorage = () => { carrinho = JSON.parse(localStorage.getItem('carrinhoZapEsfirras')) || []; renderizarItensCarrinho(); };
    
    const adicionarAoCarrinho = (produto, quantidade = 1, observacao = null, adicionais = []) => {
        cupomAplicado = null;
        const nomesAdicionais = adicionais.map(a => a.nome).sort().join(',');
        const idUnicoItem = produto.id + (observacao || '').trim().toLowerCase() + nomesAdicionais;
        const itemExistente = carrinho.find(item => item.idUnico === idUnicoItem);

        const isPromoValida = produto.is_on_promo == 1 && produto.promo_price > 0 && new Date(produto.promo_expires_at) > new Date();
        const precoFinal = isPromoValida ? parseFloat(produto.promo_price) : parseFloat(produto.price);
        
        if (itemExistente) {
            itemExistente.quantity += quantidade;
        } else {
            carrinho.push({
                ...produto,
                price: precoFinal,
                quantity: quantidade,
                observacao: observacao,
                adicionais,
                idUnico: idUnicoItem
            });
        }
        
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
        mostrarNotificacao(`${quantidade} "${produto.name}" adicionado(s)!`, 'success');
    };

    const removerItemDoCarrinho = (idUnico) => { carrinho = carrinho.filter(item => item.idUnico !== idUnico); cupomAplicado = null; salvarCarrinhoLocalStorage(); renderizarItensCarrinho(); };
    const atualizarQuantidade = (idUnico, novaQuantidade) => { const item = carrinho.find(i => i.idUnico === idUnico); if (item) { if (novaQuantidade > 0) { item.quantity = novaQuantidade; } else { removerItemDoCarrinho(idUnico); } } cupomAplicado = null; salvarCarrinhoLocalStorage(); renderizarItensCarrinho(); };
    const renderizarItensCarrinho = () => { const container = document.getElementById('lista-itens-carrinho'); if (!container) return; if (carrinho.length === 0) { container.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>'; } else { container.innerHTML = carrinho.map(item => ` <div class="item-carrinho-novo" data-id-unico="${item.idUnico}"><div class="info-item"><p class="nome-item">${item.name}</p> ${item.adicionais && item.adicionais.length > 0 ? ` <div class="adicionais-carrinho"> ${item.adicionais.map(ad => `<span>+ ${ad.nome}</span>`).join('')} </div> ` : ''} <span class="preco-unitario-item">${formatCurrency(item.price)}</span> ${item.observacao ? `<p class="observacao-item">Obs: ${item.observacao}</p>` : ''} </div> <div class="acoes-item"> <div class="seletor-quantidade-carrinho"> <button class="diminuir-item">-</button> <span>${item.quantity}</span> <button class="aumentar-item">+</button> </div> <button class="botao-remover-item"> <ion-icon name="trash-outline"></ion-icon> </button> </div> </div> `).join(''); } atualizarTodosResumos(); };
    const atualizarTodosResumos = () => { const subtotal = carrinho.reduce((acc, item) => { const precoAdicionais = item.adicionais ? item.adicionais.reduce((sum, ad) => sum + ad.price, 0) : 0; const precoBase = parseFloat(item.price); return acc + ((precoBase + precoAdicionais) * item.quantity); }, 0); const trackerEl = document.getElementById('entrega-gratis-tracker'); const successEl = document.getElementById('entrega-gratis-success'); if (trackerEl && successEl) { if (subtotal > 0 && subtotal < metaEntregaGratis) { const faltam = metaEntregaGratis - subtotal; const progresso = (subtotal / metaEntregaGratis) * 100; trackerEl.style.display = 'flex'; successEl.style.display = 'none'; document.getElementById('entrega-gratis-texto').textContent = `Faltam ${formatCurrency(faltam)} para entrega grátis!`; document.getElementById('entrega-gratis-progress').style.width = `${progresso}%`; } else if (subtotal >= metaEntregaGratis) { trackerEl.style.display = 'none'; successEl.style.display = 'flex'; } else { trackerEl.style.display = 'none'; successEl.style.display = 'none'; } } let taxaEntregaFinal = pedido.metodoEntrega === 'retirada' || carrinho.length === 0 ? 0 : taxaDeEntrega; let desconto = 0; let linhaDescontoHTML = ''; if (cupomAplicado && cupomAplicado.discount_type === 'free_delivery' && subtotal >= cupomAplicado.min_purchase_value) { desconto = taxaEntregaFinal; taxaEntregaFinal = 0; linhaDescontoHTML = `<div class="linha-resumo desconto"><span>Desconto (${cupomAplicado.code})</span><span>- ${formatCurrency(desconto)}</span></div>`; } else if (subtotal >= metaEntregaGratis && pedido.metodoEntrega !== 'retirada') { desconto = taxaDeEntrega; taxaEntregaFinal = 0; linhaDescontoHTML = `<div class="linha-resumo desconto"><span>Promoção Entrega Grátis</span><span>- ${formatCurrency(desconto)}</span></div>`; } const total = subtotal - desconto + taxaEntregaFinal; const resumoHTML = ` <div class="linha-resumo"> <span>Subtotal</span> <span>${formatCurrency(subtotal)}</span> </div> ${linhaDescontoHTML} <div class="linha-resumo"> <span>Taxa de entrega</span> <span>${(taxaEntregaFinal === 0 && pedido.metodoEntrega !== 'retirada') ? 'Grátis' : formatCurrency(taxaEntregaFinal)}</span> </div> <div class="linha-resumo total"> <span>Total</span> <span>${formatCurrency(total)}</span> </div> `; const resumoRodapeEl = document.getElementById('resumo-rodape-geral'); if (resumoRodapeEl) { if (carrinho.length > 0) { resumoRodapeEl.innerHTML = resumoHTML; resumoRodapeEl.style.display = 'block'; } else { resumoRodapeEl.style.display = 'none'; } } const totalItens = carrinho.reduce((acc, item) => acc + item.quantity, 0); if (contadorCarrinhoMobileEl) { contadorCarrinhoMobileEl.textContent = totalItens; contadorCarrinhoMobileEl.classList.toggle('ativo', totalItens > 0); } if (contadorCarrinhoDesktopEl) { contadorCarrinhoDesktopEl.textContent = totalItens; contadorCarrinhoDesktopEl.classList.toggle('ativo', totalItens > 0); } };
    const atualizarDisplayPagamento = () => { const container = document.getElementById('card-info-pagamento'); if (!container) return; let iconName = 'card-outline'; let titulo = ''; let subtitulo = ''; if (pedido.pagamento.metodo === 'Pix') { iconName = 'logo-paypal'; titulo = 'Pix'; subtitulo = pedido.pagamento.tipo; } else if (pedido.pagamento.metodo === 'Dinheiro') { iconName = 'wallet-outline'; titulo = 'Dinheiro'; subtitulo = 'Pagamento na entrega'; if (pedido.pagamento.trocoPara > 0) { subtitulo = `Troco para ${formatCurrency(pedido.pagamento.trocoPara)}`; } } else { iconName = 'card-outline'; titulo = `Cartão de ${pedido.pagamento.tipo}`; subtitulo = 'Pagamento na entrega'; } container.innerHTML = ` <ion-icon name="${iconName}"></ion-icon> <div class="card-info-texto"> <p>${titulo}</p> <span>${subtitulo}</span> </div> <a href="#" id="btn-trocar-pagamento">Trocar</a> `; const btnTrocar = document.getElementById('btn-trocar-pagamento'); if (btnTrocar) btnTrocar.addEventListener('click', (e) => { e.preventDefault(); navegarCarrinho('escolher-pagamento'); }); };
    const atualizarLinkWhatsapp = () => { const btnWhatsapp = document.getElementById('btn-whatsapp-comprovante'); if (!btnWhatsapp) return; const nome = document.getElementById('cliente-nome').value || document.getElementById('retirada-nome').value; const telefone = document.getElementById('cliente-telefone').value || document.getElementById('retirada-telefone').value; const mensagem = `Olá, aqui está o comprovante do meu pedido. \nNome: ${nome}\nTelefone: ${telefone}`; const mensagemCodificada = encodeURIComponent(mensagem); btnWhatsapp.href = `https://wa.me/5519991432597?text=${mensagemCodificada}`; };
    const navegarCarrinho = (novaEtapa) => { etapaAtualCarrinho = novaEtapa; telasCarrinho.forEach(tela => tela.classList.toggle('tela-ativa', tela.id === `tela-${novaEtapa}`)); const textoBotao = document.querySelector('#btn-continuar-carrinho span'); const rodapeCarrinho = document.querySelector('.carrinho-rodape'); if (rodapeCarrinho) { rodapeCarrinho.style.display = (novaEtapa === 'sucesso') ? 'none' : 'flex'; } switch (novaEtapa) { case 'itens': if (tituloCarrinho) tituloCarrinho.textContent = 'Meu Carrinho'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'none'; if (textoBotao) textoBotao.textContent = 'Continuar'; break; case 'metodo-entrega': if (tituloCarrinho) tituloCarrinho.textContent = 'Como Deseja Receber?'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Continuar'; break; case 'dados-entrega': if (tituloCarrinho) tituloCarrinho.textContent = 'Endereço de Entrega'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Ir para o Pagamento'; break; case 'dados-retirada': if (tituloCarrinho) tituloCarrinho.textContent = 'Dados para Retirada'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Ir para o Pagamento'; break; case 'pagamento': if (tituloCarrinho) tituloCarrinho.textContent = 'Pagamento'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Finalizar Pedido'; atualizarDisplayPagamento(); break; case 'escolher-pagamento': if (tituloCarrinho) tituloCarrinho.textContent = 'Forma de Pagamento'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Confirmar Seleção'; atualizarLinkWhatsapp(); break; case 'sucesso': if (tituloCarrinho) tituloCarrinho.textContent = 'Pedido Finalizado'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'none'; break; } atualizarTodosResumos(); };
    const togglePainelCarrinho = (abrir = null) => { if (!painelCarrinho) return; const ativo = abrir === null ? !painelCarrinho.classList.contains('ativo') : abrir; if (ativo) { navegarCarrinho('itens'); } painelCarrinho.classList.toggle('ativo', ativo); if (sobreposicaoCarrinho) { sobreposicaoCarrinho.classList.toggle('ativo', ativo); } };
    const finalizarEEnviarPedido = async () => { const btnTexto = document.querySelector('#btn-continuar-carrinho span'); const btnOriginalText = btnTexto ? btnTexto.textContent : 'Finalizar Pedido'; const btnCarrinho = btnContinuarCarrinho; if (btnTexto) btnTexto.textContent = 'Enviando...'; if (btnCarrinho) btnCarrinho.disabled = true; try { let deliveryInfo, clientInfo; if (pedido.metodoEntrega === 'retirada') { deliveryInfo = { tipo: 'Retirada', rua: 'Retirar no local' }; clientInfo = { nome: document.getElementById('retirada-nome').value, telefone: document.getElementById('retirada-telefone').value || 'Não informado' }; } else { deliveryInfo = { tipo: 'Entrega', rua: document.getElementById('endereco-rua').value, bairro: document.getElementById('endereco-bairro').value, numero: document.getElementById('endereco-numero').value, complemento: document.getElementById('endereco-complemento').value, referencia: document.getElementById('endereco-referencia').value }; clientInfo = { nome: document.getElementById('cliente-nome').value, telefone: document.getElementById('cliente-telefone').value || 'Não informado' }; } const subtotal = carrinho.reduce((acc, item) => { const precoAdicionais = item.adicionais ? item.adicionais.reduce((sum, ad) => sum + ad.price, 0) : 0; const precoBase = parseFloat(item.price); return acc + ((precoBase + precoAdicionais) * item.quantity); }, 0); let taxaEntregaFinal = pedido.metodoEntrega === 'retirada' ? 0 : taxaDeEntrega; let desconto = 0; if (cupomAplicado && cupomAplicado.discount_type === 'free_delivery' && subtotal >= cupomAplicado.min_purchase_value) { desconto = taxaEntregaFinal; taxaEntregaFinal = 0; } else if (subtotal >= metaEntregaGratis && pedido.metodoEntrega !== 'retirada') { desconto = taxaDeEntrega; taxaEntregaFinal = 0; } const total = subtotal - desconto + taxaEntregaFinal; const pedidoParaAPI = { client_info: clientInfo, delivery_info: deliveryInfo, items: carrinho, total_value: total, payment_info: pedido.pagamento, status: 'Novo' }; const response = await fetch('http://localhost:3000/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoParaAPI), }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Não foi possível enviar o pedido.'); } const result = await response.json(); console.log('Pedido enviado:', result); const historicoPedidos = JSON.parse(localStorage.getItem('pedidosZapEsfirras')) || []; const novoPedidoHistorico = { id: result.orderId, data: new Date().toISOString(), status: 'Novo', tipoEntrega: pedido.metodoEntrega }; historicoPedidos.push(novoPedidoHistorico); localStorage.setItem('pedidosZapEsfirras', JSON.stringify(historicoPedidos)); navegarCarrinho('sucesso'); carrinho = []; cupomAplicado = null; salvarCarrinhoLocalStorage(); renderizarItensCarrinho(); setTimeout(() => { togglePainelCarrinho(false); setTimeout(() => { if (btnTexto) btnTexto.textContent = btnOriginalText; if (btnCarrinho) btnCarrinho.disabled = false; navegarCarrinho('itens'); }, 500); }, 3000); } catch (error) { console.error('Erro ao finalizar pedido:', error); mostrarNotificacao(error.message || 'Erro ao enviar pedido. Tente novamente.', 'error'); if (btnTexto) btnTexto.textContent = btnOriginalText; if (btnCarrinho) btnCarrinho.disabled = false; } };
    function gerenciarEstadoLogin() { const token = localStorage.getItem('authToken'); const customerInfo = JSON.parse(localStorage.getItem('customerInfo')); const botaoContaDesktop = document.getElementById('botao-conta-desktop'); const infoUsuarioDesktop = document.getElementById('info-usuario-desktop'); const nomeUsuarioDesktop = document.getElementById('nome-usuario-desktop'); const botaoLogoutDesktop = document.getElementById('botao-logout-desktop'); const botaoPerfilMobileLink = document.getElementById('botao-perfil-mobile'); const botaoPerfilMobileText = botaoPerfilMobileLink ? botaoPerfilMobileLink.querySelector('.bottom-nav-text') : null; if (token && customerInfo) { if (botaoContaDesktop) botaoContaDesktop.style.display = 'none'; if (infoUsuarioDesktop) infoUsuarioDesktop.style.display = 'flex'; if (nomeUsuarioDesktop) nomeUsuarioDesktop.textContent = `Olá, ${customerInfo.name.split(' ')[0]}!`; if (botaoPerfilMobileText) botaoPerfilMobileText.textContent = 'Minha Conta'; if (botaoPerfilMobileLink) botaoPerfilMobileLink.href = 'perfil.html'; if (botaoLogoutDesktop) { if (!botaoLogoutDesktop.dataset.listener) { botaoLogoutDesktop.addEventListener('click', () => { localStorage.removeItem('authToken'); localStorage.removeItem('customerInfo'); window.location.reload(); }); botaoLogoutDesktop.dataset.listener = 'true'; } } } else { if (botaoContaDesktop) botaoContaDesktop.style.display = 'flex'; if (infoUsuarioDesktop) infoUsuarioDesktop.style.display = 'none'; if (botaoPerfilMobileText) botaoPerfilMobileText.textContent = 'Perfil'; if (botaoPerfilMobileLink) botaoPerfilMobileLink.href = 'login-cliente.html'; } }
    async function init() { gerenciarEstadoLogin(); atualizarInfoCabecalho(); carregarCarrinhoLocalStorage(); if (barraFiltros) { atualizarDisplayPagamento(); try { await carregarDadosDaAPI(); } catch (e) { console.error("Falha fatal na inicialização ao carregar dados da API.", e) } } setTimeout(() => { if (telaCarregamento) { telaCarregamento.style.opacity = '0'; telaCarregamento.addEventListener('transitionend', () => telaCarregamento.style.display = 'none'); } if (conteudoPrincipal) { conteudoPrincipal.style.display = 'block'; ajustarPaddingCorpo(); if (barraFiltros) gerenciarSetasScroll(); } }, 200); configurarEventListeners(); }
    function configurarBuscaPorCEP() { const inputCEP = document.getElementById('endereco-cep'); if (!inputCEP) return; inputCEP.addEventListener('input', (e) => { let cep = e.target.value.replace(/\D/g, ''); cep = cep.replace(/^(\d{5})(\d)/, '$1-$2'); e.target.value = cep; if (cep.replace('-', '').length === 8) { buscarEnderecoPorCEP(cep); } }); }
    async function buscarEnderecoPorCEP(cep) { const inputRua = document.getElementById('endereco-rua'); const inputBairro = document.getElementById('endereco-bairro'); const inputNumero = document.getElementById('endereco-numero'); try { const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep.replace('-', '')}`); if (!response.ok) throw new Error('CEP não encontrado.'); const data = await response.json(); inputRua.value = data.street; inputBairro.value = data.neighborhood; inputRua.readOnly = false; inputBairro.readOnly = false; inputNumero.focus(); await calcularTaxaPorBairro(data.neighborhood); } catch (error) { console.error(error); mostrarNotificacao("CEP não encontrado. Verifique e tente novamente.", "error"); inputRua.value = ''; inputBairro.value = ''; } }
    async function calcularTaxaPorBairro(bairro) { if (!bairro) { taxaDeEntrega = 5.00; atualizarTodosResumos(); return; } try { const response = await fetch('http://localhost:3000/api/calculate-delivery-fee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bairro: bairro }) }); if (!response.ok) throw new Error('Não foi possível calcular a taxa.'); const data = await response.json(); taxaDeEntrega = data.taxaDeEntrega; mostrarNotificacao(`Taxa de entrega para ${bairro}: R$ ${taxaDeEntrega.toFixed(2).replace('.',',')}`); atualizarTodosResumos(); } catch (error) { console.error(error); mostrarNotificacao("Erro ao buscar taxa. Taxa padrão aplicada.", "error"); taxaDeEntrega = 5.00; atualizarTodosResumos(); } }
    function configurarEventListeners() { configurarBuscaPorCEP(); window.addEventListener('resize', ajustarPaddingCorpo); const mainContainer = document.querySelector('main.container-principal'); if (mainContainer) { mainContainer.addEventListener('click', (e) => { const cartao = e.target.closest('.cartao-produto'); if (!cartao) return; const produtoId = parseInt(cartao.dataset.id); const categoria = cartao.dataset.category; const produto = menuData[categoria]?.find(p => p.id === produtoId); if (!produto) return; if (e.target.closest('.botao-adicionar')) { adicionarAoCarrinho(produto, 1, null, []); } else { produtoAtualModal = { id: produto.id, name: produto.name, price: parseFloat(produto.price), image: produto.image, description: produto.description, precoBase: parseFloat(produto.price), precoFinal: parseFloat(produto.price) }; if (document.getElementById('nome-produto-modal')) document.getElementById('nome-produto-modal').textContent = produto.name; if (document.getElementById('desc-produto-modal')) document.getElementById('desc-produto-modal').textContent = produto.description; if (document.querySelector('.modal-produto .entrada-quantidade')) document.querySelector('.modal-produto .entrada-quantidade').value = 1; if (document.getElementById('observacao-produto')) document.getElementById('observacao-produto').value = ''; popularAdicionais(produto); atualizarPrecoTotalModal(); if (sobreposicaoModal) sobreposicaoModal.classList.add('ativo'); } }); } todasEntradasPesquisa.forEach(input => { input.addEventListener('input', () => { const termo = input.value.toLowerCase().trim(); todasEntradasPesquisa.forEach(outroInput => { if (outroInput !== input) outroInput.value = termo; }); filtrarEBuscarProdutos(termo); }); }); const botaoPesquisa = document.querySelector('.acoes-navegacao .botao-pesquisa'); if (botaoPesquisa) { botaoPesquisa.addEventListener('click', (e) => { e.preventDefault(); const caixaPesquisa = botaoPesquisa.closest('.caixa-pesquisa'); const inputPesquisa = caixaPesquisa.querySelector('.texto-pesquisa'); caixaPesquisa.classList.toggle('ativo'); if (caixaPesquisa.classList.contains('ativo')) { inputPesquisa.focus(); } }); } if (barraFiltros) { barraFiltros.addEventListener('click', (e) => { if (e.target.classList.contains('botao-filtro')) { barraFiltros.querySelector('.ativo')?.classList.remove('ativo'); e.target.classList.add('ativo'); filtrarPorCategoria(e.target.dataset.categoria); } }); btnScrollLeft.addEventListener('click', () => barraFiltros.scrollBy({ left: -250, behavior: 'smooth' })); btnScrollRight.addEventListener('click', () => barraFiltros.scrollBy({ left: 250, behavior: 'smooth' })); barraFiltros.addEventListener('scroll', gerenciarSetasScroll); } const btnFecharModal = document.getElementById('botao-fechar-modal'); if (btnFecharModal) btnFecharModal.addEventListener('click', () => sobreposicaoModal.classList.remove('ativo')); const btnAdicionarModal = document.querySelector('.botao-adicionar-carrinho-modal'); if (btnAdicionarModal) btnAdicionarModal.addEventListener('click', () => { const adicionaisSelecionados = []; document.querySelectorAll('#lista-adicionais input:checked').forEach(checkbox => { adicionaisSelecionados.push({ name: checkbox.dataset.nome, price: parseFloat(checkbox.dataset.preco) }); }); const produtoParaCarrinho = { id: produtoAtualModal.id, name: produtoAtualModal.name, price: parseFloat(produtoAtualModal.precoFinal), image: produtoAtualModal.image }; const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value); const observacao = document.getElementById('observacao-produto').value.trim(); adicionarAoCarrinho(produtoParaCarrinho, quantidade, observacao || null, adicionaisSelecionados); sobreposicaoModal.classList.remove('ativo'); }); if (toggleAdicionaisBtn) toggleAdicionaisBtn.addEventListener('click', () => { toggleAdicionaisBtn.classList.toggle('ativo'); listaAdicionaisContainer.classList.toggle('ativo'); }); if (listaAdicionaisContainer) listaAdicionaisContainer.addEventListener('change', (e) => { if (e.target.type === 'checkbox') { atualizarPrecoTotalModal(); } }); const btnMaisModal = document.querySelector('.modal-produto .botao-mais'); if (btnMaisModal) btnMaisModal.addEventListener('click', () => { const input = document.querySelector('.modal-produto .entrada-quantidade'); input.value = parseInt(input.value) + 1; atualizarPrecoTotalModal(); }); const btnMenosModal = document.querySelector('.modal-produto .botao-menos'); if (btnMenosModal) btnMenosModal.addEventListener('click', () => { const input = document.querySelector('.modal-produto .entrada-quantidade'); if (parseInt(input.value) > 1) { input.value = parseInt(input.value) - 1; atualizarPrecoTotalModal(); } }); const listaItensCarrinhoEl = document.getElementById('lista-itens-carrinho'); if (listaItensCarrinhoEl) listaItensCarrinhoEl.addEventListener('click', (e) => { const itemEl = e.target.closest('.item-carrinho-novo'); if (!itemEl) return; const idUnico = itemEl.dataset.idUnico; const itemNoCarrinho = carrinho.find(i => i.idUnico === idUnico); if (!itemNoCarrinho) return; if (e.target.closest('.aumentar-item')) { atualizarQuantidade(idUnico, itemNoCarrinho.quantity + 1); } else if (e.target.closest('.diminuir-item')) { atualizarQuantidade(idUnico, itemNoCarrinho.quantity - 1); } else if (e.target.closest('.botao-remover-item')) { removerItemDoCarrinho(idUnico); } }); if (btnCarrinhoMobile) btnCarrinhoMobile.addEventListener('click', () => togglePainelCarrinho(true)); if (btnCarrinhoDesktop) btnCarrinhoDesktop.addEventListener('click', () => togglePainelCarrinho(true)); const btnFecharPainel = document.getElementById('botao-fechar-painel-novo'); if (btnFecharPainel) btnFecharPainel.addEventListener('click', () => togglePainelCarrinho(false)); const btnAddMaisItens = document.getElementById('adicionar-mais-itens'); if (btnAddMaisItens) btnAddMaisItens.addEventListener('click', (e) => { e.preventDefault(); togglePainelCarrinho(false); }); if (sobreposicaoCarrinho) sobreposicaoCarrinho.addEventListener('click', () => togglePainelCarrinho(false)); if (btnContinuarCarrinho) { btnContinuarCarrinho.addEventListener('click', () => { if (carrinho.length === 0) { mostrarNotificacao("Sua sacola está vazia!"); return; } switch (etapaAtualCarrinho) { case 'itens': navegarCarrinho('metodo-entrega'); break; case 'metodo-entrega': const metodoSelecionado = document.querySelector('input[name="tipo-entrega"]:checked').value; pedido.metodoEntrega = metodoSelecionado; navegarCarrinho(metodoSelecionado === 'padrao' ? 'dados-entrega' : 'dados-retirada'); break; case 'dados-entrega': if (formEndereco && formEndereco.checkValidity()) { navegarCarrinho('pagamento'); } else if (formEndereco) { formEndereco.reportValidity(); } break; case 'dados-retirada': if (formRetirada && formRetirada.checkValidity()) { navegarCarrinho('pagamento'); } else if (formRetirada) { formRetirada.reportValidity(); } break; case 'pagamento': finalizarEEnviarPedido(); break; case 'escolher-pagamento': const metodo = document.querySelector('input[name="forma-pagamento-principal"]:checked').value; if (metodo === 'pix') { const tipoPix = document.querySelector('input[name="sub-opcao-pix"]:checked').value; pedido.pagamento = { metodo: 'Pix', tipo: tipoPix === 'online' ? 'Pagar online agora' : 'Pagar na entrega/retirada' }; } else if (metodo === 'cartao') { pedido.pagamento = { metodo: 'Cartão', tipo: document.querySelector('input[name="sub-opcao-cartao"]:checked').value === 'credito' ? 'Crédito' : 'Débito' }; } else if (metodo === 'dinheiro') { const precisaTroco = document.querySelector('input[name="precisa-troco"]:checked').value === 'sim'; const valorTrocoInput = document.getElementById('valor-troco').value.replace(',', '.'); const trocoPara = precisaTroco ? parseFloat(valorTrocoInput) : 0; pedido.pagamento = { metodo: 'Dinheiro', trocoPara: isNaN(trocoPara) ? 0 : trocoPara }; } navegarCarrinho('pagamento'); break; } }); } if (btnVoltarCarrinho) { btnVoltarCarrinho.addEventListener('click', () => { switch (etapaAtualCarrinho) { case 'pagamento': navegarCarrinho(pedido.metodoEntrega === 'padrao' ? 'dados-entrega' : 'dados-retirada'); break; case 'dados-entrega': case 'dados-retirada': navegarCarrinho('metodo-entrega'); break; case 'metodo-entrega': navegarCarrinho('itens'); break; case 'escolher-pagamento': navegarCarrinho('pagamento'); break; } }); } const painelPagamento = document.getElementById('tela-escolher-pagamento'); if(painelPagamento) { painelPagamento.addEventListener('change', (e) => { const target = e.target; if (target.name === 'forma-pagamento-principal') { document.getElementById('sub-opcoes-dinheiro').classList.toggle('visivel', target.value === 'dinheiro'); document.getElementById('sub-opcoes-cartao').classList.toggle('visivel', target.value === 'cartao'); document.getElementById('sub-opcoes-pix').classList.toggle('visivel', target.value === 'pix'); } if (target.name === 'precisa-troco') { document.getElementById('container-troco').classList.toggle('visivel', target.value === 'sim'); } if (target.name === 'sub-opcao-pix') { const pixDetails = document.getElementById('detalhes-pix-online'); if(pixDetails) pixDetails.style.display = target.value === 'online' ? 'block' : 'none'; } }); } const cpfToggle = document.getElementById('cpf-toggle'); if(cpfToggle) { cpfToggle.addEventListener('change', () => { document.getElementById('container-cpf').classList.toggle('visivel', cpfToggle.checked); }); } }

    init();
});