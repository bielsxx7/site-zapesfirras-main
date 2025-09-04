document.addEventListener('DOMContentLoaded', () => {

    const socket = io('http://localhost:3000');

    socket.on('menu_updated', () => {
        console.log('Recebido evento de atualização do menu! Recarregando...');
        mostrarNotificacao('O cardápio foi atualizado!');
        carregarDadosDaAPI();
    });

    let carrinho = [];
    let taxaDeEntrega = 5.00;
    let produtoAtualModal = {};
    let timeoutNotificacao;
    let etapaAtualCarrinho = 'itens';
    let pedido = {
        pagamento: { metodo: 'Cartão', tipo: 'Crédito' }
    };
    let menuData = {};

    const adicionaisPorCategoria = {
        'Esfirras Salgadas': [{ name: 'Bacon', price: 3.50 }, { name: 'Catupiry Extra', price: 3.00 }, { name: 'Cheddar', price: 3.00 }, { name: 'Alho Frito', price: 2.00 }],
        'Beirutes': [{ name: 'Ovo', price: 2.50 }, { name: 'Bacon', price: 4.00 }, { name: 'Catupiry', price: 3.50 }, { name: 'Dobro de Queijo', price: 5.00 }],
        'Lanches': [{ name: 'Ovo', price: 2.50 }, { name: 'Bacon', price: 4.00 }, { name: 'Cheddar', price: 3.00 }, { name: 'Hambúrguer Extra', price: 6.00 }],
        'default': [{ name: 'Bacon', price: 3.50 }, { name: 'Cheddar', price: 3.00 }, { name: 'Catupiry', price: 3.00 },]
    };

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
    const secaoPecaTambem = document.querySelector('.secao-peca-tambem');
    const barraFiltros = document.querySelector('.barra-filtros');
    const btnScrollLeft = document.getElementById('scroll-left');
    const btnScrollRight = document.getElementById('scroll-right');
    const btnCarrinhoMobile = document.getElementById('botao-carrinho-mobile');
    const contadorCarrinhoMobileEl = document.getElementById('contador-carrinho-mobile');
    const btnCarrinhoDesktop = document.getElementById('botao-carrinho-desktop');
    const contadorCarrinhoDesktopEl = document.getElementById('contador-carrinho-desktop');
    const toggleAdicionaisBtn = document.getElementById('toggle-adicionais');
    const listaAdicionaisContainer = document.getElementById('lista-adicionais');
    const containerFormEndereco = document.getElementById('container-form-endereco');
    const containerFormRetirada = document.getElementById('container-form-retirada');
    const secaoOpcoesEntrega = document.querySelector('.secao-opcoes-entrega');

    const clienteNomeInput = document.getElementById('cliente-nome');
    const clienteTelefoneInput = document.getElementById('cliente-telefone');
    const retiradaNomeInput = document.getElementById('retirada-nome');
    const retiradaTelefoneInput = document.getElementById('retirada-telefone');

    let todosCartoesProduto = [];
    let secoesProdutos = [];

    function atualizarLinkWhatsapp() {
        const btnWhatsapp = document.getElementById('btn-whatsapp-comprovante');
        if (!btnWhatsapp) return;

        const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value;
        let nome = '';
        let telefone = '';

        if (tipoEntrega === 'retirada') {
            nome = retiradaNomeInput.value;
            telefone = retiradaTelefoneInput.value;
        } else {
            nome = clienteNomeInput.value;
            telefone = clienteTelefoneInput.value;
        }

        const mensagem = `Estou lhe enviando o comprovante, meu nome é ${nome} e numero de telefone ${telefone}`;
        const mensagemCodificada = encodeURIComponent(mensagem);

        btnWhatsapp.href = `https://wa.me/5519991432597?text=${mensagemCodificada}`;
    }

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
                        const secaoHTML = `<section class="container-secao" data-category="${categoria.name}"><h2 class="titulo-secao">${categoria.name}</h2><div class="grade-produtos">${produtosDaCategoria.map(produto => criarCardProdutoHTML(produto)).join('')}</div></section>`;
                        containerPrincipal.insertAdjacentHTML('beforeend', secaoHTML);
                    }
                });
                todosCartoesProduto = document.querySelectorAll('.cartao-produto');
                secoesProdutos = document.querySelectorAll('.container-secao[data-category]');
            }
            renderizarSugestoes();
            gerenciarSetasScroll();
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

    function criarCardProdutoHTML(produto) {
        return `<div class="cartao-produto" data-id="${produto.id}" data-category="${produto.category_name}"><div class="container-detalhes-produto"><img src="${produto.image || 'assets/placeholder.png'}" alt="${produto.name}" class="imagem-produto"><div class="texto-info-produto"><h3>${produto.name}</h3><h4>${produto.description || ''}</h4></div></div><div class="acoes-produto"><span class="preco">R$ ${parseFloat(produto.price).toFixed(2).replace('.', ',')}</span><div class="botoes-container"><button class="botao-adicionar"><ion-icon name="add-outline"></ion-icon></button></div></div></div>`;
    }

    function renderizarSugestoes() {
        const container = document.querySelector('.carrossel-sugestoes');
        if (!container) return;
        const bebidas = [...(menuData['Refrigerantes'] || []), ...(menuData['Sucos'] || []), ...(menuData['Chope/Cervejas'] || [])];
        const sugestoes = bebidas.sort(() => 0.5 - Math.random()).slice(0, 3);
        container.innerHTML = '';
        sugestoes.forEach(item => {
            container.insertAdjacentHTML('beforeend', `<div class="item-sugestao" data-id="${item.id}" data-category="${item.category_name}"><img src="${item.image}" alt="${item.name}"><p>${item.name}</p><span>${(parseFloat(item.price)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><button class="botao-add-sugestao">+</button></div>`);
        });
    }

    function atualizarInfoCabecalho() { const greetingEl = document.getElementById('greeting'); const dateEl = document.getElementById('current-date'); const mobileGreetingContainer = document.getElementById('header-greeting-mobile'); if (!greetingEl || !dateEl) return; const agora = new Date(); const hora = agora.getHours(); let saudacao; if (hora >= 5 && hora < 12) { saudacao = 'Bom dia!'; } else if (hora >= 12 && hora < 18) { saudacao = 'Boa tarde!'; } else { saudacao = 'Boa noite!'; } const opcoesData = { weekday: 'long', month: 'long', day: 'numeric' }; let dataFormatada = agora.toLocaleDateString('pt-BR', opcoesData); dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1); greetingEl.textContent = saudacao; dateEl.textContent = dataFormatada; if (mobileGreetingContainer) { mobileGreetingContainer.innerHTML = `<span>${saudacao}</span> &#8226; <span>${dataFormatada}</span>`; } }
    function ajustarPaddingCorpo() { const navBar = document.querySelector('.barra-navegacao'); if (navBar) { const alturaTotalOcupada = navBar.getBoundingClientRect().bottom; document.body.style.paddingTop = `${alturaTotalOcupada}px`; } }
    function filtrarEBuscarProdutos(termo) { if (!todosCartoesProduto) return; let produtoEncontrado = false; todosCartoesProduto.forEach(cartao => { const nomeProduto = cartao.querySelector('h3').textContent.toLowerCase(); const deveMostrar = nomeProduto.includes(termo); cartao.style.display = deveMostrar ? 'flex' : 'none'; if (deveMostrar) produtoEncontrado = true; }); secoesProdutos.forEach(secao => { const produtosVisiveis = secao.querySelectorAll('.cartao-produto[style*="display: flex"]').length; secao.style.display = produtosVisiveis > 0 || termo === '' ? 'block' : 'none'; }); if (mensagemSemResultados) { mensagemSemResultados.style.display = !produtoEncontrado && termo !== '' ? 'block' : 'none'; } }
    function filtrarPorCategoria(categoriaAlvo) { if (!secoesProdutos) return; secoesProdutos.forEach(secao => { const categoriaDaSecao = secao.dataset.category; secao.style.display = (categoriaAlvo === 'Todos' || categoriaDaSecao === categoriaAlvo) ? 'block' : 'none'; }); todasEntradasPesquisa.forEach(input => input.value = ''); if (mensagemSemResultados) mensagemSemResultados.style.display = 'none'; }
    function mostrarNotificacao(mensagem) { if (!notificacao || !textoNotificacao) return; clearTimeout(timeoutNotificacao); textoNotificacao.textContent = mensagem; notificacao.classList.add('mostrar'); timeoutNotificacao = setTimeout(() => notificacao.classList.remove('mostrar'), 2500); }
    function gerenciarSetasScroll() { if (!barraFiltros || !btnScrollLeft || !btnScrollRight) return; const temScroll = barraFiltros.scrollWidth > barraFiltros.clientWidth; if (!temScroll) { btnScrollLeft.classList.remove('visivel'); btnScrollRight.classList.remove('visivel'); return; } btnScrollLeft.classList.toggle('visivel', barraFiltros.scrollLeft > 0); const maxScrollLeft = barraFiltros.scrollWidth - barraFiltros.clientWidth; btnScrollRight.classList.toggle('visivel', barraFiltros.scrollLeft < maxScrollLeft - 1); }
    function atualizarPrecoTotalModal() { const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value); let precoAdicionais = 0; const adicionaisSelecionados = document.querySelectorAll('#lista-adicionais input[type="checkbox"]:checked'); adicionaisSelecionados.forEach(checkbox => { precoAdicionais += parseFloat(checkbox.dataset.preco); }); const precoUnitarioFinal = produtoAtualModal.precoBase + precoAdicionais; const precoTotal = precoUnitarioFinal * quantidade; produtoAtualModal.precoFinal = precoUnitarioFinal; document.querySelector('.botao-adicionar-carrinho-modal').textContent = `Adicionar R$ ${precoTotal.toFixed(2).replace('.', ',')}`; }
    function popularAdicionais(produto) { if (!listaAdicionaisContainer || !toggleAdicionaisBtn) return; listaAdicionaisContainer.innerHTML = ''; toggleAdicionaisBtn.classList.remove('ativo'); listaAdicionaisContainer.classList.remove('ativo'); let adicionais = null; if (produto.custom_additions && produto.custom_additions.length > 0) { adicionais = produto.custom_additions; } else { const categoria = produto.category_name; if (categoria) { const categoriaNormalizada = categoria.includes('Salgadas') || categoria.includes('Doces') ? categoria.split(' ')[1] : categoria; adicionais = adicionaisPorCategoria[categoriaNormalizada] || adicionaisPorCategoria['default']; } } if (adicionais && adicionais.length > 0) { adicionais.forEach((adicional, index) => { const itemHTML = ` <div class="item-adicional"> <label for="adicional-${index}"> <input type="checkbox" id="adicional-${index}" data-nome="${adicional.name || adicional.nome}" data-preco="${adicional.price || adicional.preco}"> <span class="checkmark-adicional"></span> <span class="nome-adicional">${adicional.name || adicional.nome}</span> </label> <span class="preco-adicional">+ R$ ${(adicional.price || adicional.preco).toFixed(2).replace('.', ',')}</span> </div> `; listaAdicionaisContainer.insertAdjacentHTML('beforeend', itemHTML); }); document.querySelector('.area-adicionais').style.display = 'block'; } else { document.querySelector('.area-adicionais').style.display = 'none'; } }
    const salvarCarrinhoLocalStorage = () => localStorage.setItem('carrinhoZapEsfirras', JSON.stringify(carrinho));
    const carregarCarrinhoLocalStorage = () => { carrinho = JSON.parse(localStorage.getItem('carrinhoZapEsfirras')) || []; renderizarItensCarrinho(); };

    const adicionarAoCarrinho = (produto, quantidade = 1, observacao = null, adicionais = []) => {
        const nomesAdicionais = adicionais.map(a => a.nome).sort().join(',');
        const idUnicoItem = produto.id + (observacao || '').trim().toLowerCase() + nomesAdicionais;
        const itemExistente = carrinho.find(item => item.idUnico === idUnicoItem);
        if (itemExistente) {
            itemExistente.quantity += quantidade;
        } else {
            carrinho.push({ ...produto, price: parseFloat(produto.price), quantity: quantidade, observacao: observacao, adicionais, idUnico: idUnicoItem });
        }
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
        mostrarNotificacao(`${quantidade} "${produto.name}" adicionado(s)!`);
    };

    const atualizarQuantidade = (idUnico, novaQuantidade) => {
        if (novaQuantidade < 1) {
            removerItemDoCarrinho(idUnico);
            return;
        }
        const itemIndex = carrinho.findIndex(item => item.idUnico === idUnico);
        if (itemIndex > -1) {
            carrinho[itemIndex].quantity = novaQuantidade;
            salvarCarrinhoLocalStorage();
            renderizarItensCarrinho();
        }
    };

    const removerItemDoCarrinho = (idUnico) => { carrinho = carrinho.filter(item => item.idUnico !== idUnico); salvarCarrinhoLocalStorage(); renderizarItensCarrinho(); };
    const renderizarItensCarrinho = () => { const container = document.getElementById('lista-itens-carrinho'); if (!container) return; if (carrinho.length === 0) { container.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>'; } else { container.innerHTML = carrinho.map(item => ` <div class="item-carrinho-novo" data-id-unico="${item.idUnico}"> <img src="${item.image}" alt="${item.name}"> <div class="info-item"> <p class="nome-item">${item.name}</p> ${item.adicionais && item.adicionais.length > 0 ? ` <div class="adicionais-carrinho"> ${item.adicionais.map(ad => `<span>+ ${ad.nome}</span>`).join('')} </div> ` : ''} <span class="preco-unitario-item">R$ ${parseFloat(item.price).toFixed(2).replace(',', '.')}</span> ${item.observacao ? `<p class="observacao-item">Obs: ${item.observacao}</p>` : ''} </div> <div class="acoes-item"> <div class="seletor-quantidade-carrinho"> <button class="diminuir-item">-</button> <span>${item.quantity}</span> <button class="aumentar-item">+</button> </div> <button class="botao-remover-item"> <ion-icon name="trash-outline"></ion-icon> </button> </div> </div> `).join(''); } atualizarTodosResumos(); };

    // ===== INÍCIO DA MUDANÇA NO JAVASCRIPT =====
    const atualizarTodosResumos = () => {
        const subtotal = carrinho.reduce((acc, item) => {
            const precoItemTotal = parseFloat(item.price) + (item.adicionais ? item.adicionais.reduce((sum, ad) => sum + ad.price, 0) : 0);
            return acc + (precoItemTotal * item.quantity);
        }, 0);
        const tipoEntregaEl = document.querySelector('input[name="tipo-entrega"]:checked');
        const tipoEntrega = tipoEntregaEl ? tipoEntregaEl.value : 'padrao';
        const taxaEntregaFinal = tipoEntrega === 'retirada' || carrinho.length === 0 ? 0 : taxaDeEntrega;
        const total = subtotal + taxaEntregaFinal;
        
        // 1. Criamos o HTML do resumo
        const resumoHTML = `
            <div class="linha-resumo"> <span>Subtotal</span> <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span> </div>
            <div class="linha-resumo"> <span>Taxa de entrega</span> <span>R$ ${taxaEntregaFinal.toFixed(2).replace('.', ',')}</span> </div>
            <div class="linha-resumo total"> <span>Total</span> <span>R$ ${total.toFixed(2).replace('.', ',')}</span> </div>
        `;
        
        // 2. Selecionamos o NOVO container do resumo no rodapé
        const resumoRodapeEl = document.getElementById('resumo-rodape-geral');
        if (resumoRodapeEl) {
            // Se o carrinho tiver itens, mostramos o resumo e colocamos o HTML
            if (carrinho.length > 0) {
                resumoRodapeEl.innerHTML = resumoHTML;
                resumoRodapeEl.style.display = 'block';
            } else {
                // Se o carrinho estiver vazio, escondemos a caixa de resumo
                resumoRodapeEl.style.display = 'none';
            }
        }
        
        // 3. Atualizamos os contadores de ícones do carrinho (sem mudança aqui)
        const totalItens = carrinho.reduce((acc, item) => acc + item.quantity, 0);
        if (contadorCarrinhoMobileEl) {
            contadorCarrinhoMobileEl.textContent = totalItens;
            contadorCarrinhoMobileEl.classList.toggle('ativo', totalItens > 0);
        }
        if (contadorCarrinhoDesktopEl) {
            contadorCarrinhoDesktopEl.textContent = totalItens;
            contadorCarrinhoDesktopEl.classList.toggle('ativo', totalItens > 0);
        }
        // OBS: A linha que atualizava o preço no botão "Continuar" foi removida, pois agora o resumo está separado.
    };
    // ===== FIM DA MUDANÇA NO JAVASCRIPT =====

    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const atualizarDisplayPagamento = () => { const container = document.getElementById('card-info-pagamento'); if (!container) return; let iconName = 'card-outline'; let titulo = ''; let subtitulo = ''; if (pedido.pagamento.metodo === 'Pix') { iconName = 'logo-paypal'; titulo = 'Pix'; subtitulo = pedido.pagamento.tipo === 'online' ? 'Pagamento online via PIX' : 'Pagar na entrega'; } else if (pedido.pagamento.metodo === 'Dinheiro') { iconName = 'wallet-outline'; titulo = 'Dinheiro'; subtitulo = 'Pagamento na entrega'; if (pedido.pagamento.trocoPara > 0) { subtitulo = `Troco para ${formatCurrency(pedido.pagamento.trocoPara)}`; } } else { iconName = 'card-outline'; titulo = `Cartão de ${pedido.pagamento.tipo}`; subtitulo = 'Pagamento na entrega'; } container.innerHTML = ` <ion-icon name="${iconName}"></ion-icon> <div class="card-info-texto"> <p>${titulo}</p> <span>${subtitulo}</span> </div> <a href="#" id="btn-trocar-pagamento">Trocar</a> `; const btnTrocar = document.getElementById('btn-trocar-pagamento'); if (btnTrocar) btnTrocar.addEventListener('click', (e) => { e.preventDefault(); navegarCarrinho('escolher-pagamento'); }); };
    const navegarCarrinho = (novaEtapa) => { etapaAtualCarrinho = novaEtapa; telasCarrinho.forEach(tela => tela.classList.toggle('tela-ativa', tela.id === `tela-${novaEtapa}`)); const textoBotao = document.querySelector('#btn-continuar-carrinho span:first-child'); const rodapeCarrinho = document.querySelector('.carrinho-rodape'); if (rodapeCarrinho) { if (novaEtapa === 'sucesso') { rodapeCarrinho.style.display = 'none'; } else { rodapeCarrinho.style.display = 'flex'; } } switch (novaEtapa) { case 'itens': if (tituloCarrinho) tituloCarrinho.textContent = 'Meu Carrinho'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'none'; if (textoBotao) textoBotao.textContent = 'Continuar'; break; case 'entrega': if (tituloCarrinho) tituloCarrinho.textContent = 'Endereço e Entrega'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Ir para o Pagamento'; break; case 'pagamento': if (tituloCarrinho) tituloCarrinho.textContent = 'Pagamento'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Finalizar Pedido'; break; case 'escolher-pagamento': if (tituloCarrinho) tituloCarrinho.textContent = 'Forma de Pagamento'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'block'; if (textoBotao) textoBotao.textContent = 'Confirmar Seleção'; break; case 'sucesso': if (tituloCarrinho) tituloCarrinho.textContent = 'Pedido Finalizado'; if (btnVoltarCarrinho) btnVoltarCarrinho.style.display = 'none'; break; } atualizarTodosResumos(); };
    const togglePainelCarrinho = (abrir = null) => { if (!painelCarrinho) return; const ativo = abrir === null ? !painelCarrinho.classList.contains('ativo') : abrir; if (ativo) navegarCarrinho('itens'); painelCarrinho.classList.toggle('ativo', ativo); if (sobreposicaoCarrinho) sobreposicaoCarrinho.classList.toggle('ativo', ativo); };

    const gerenciarVisibilidadeFormEntrega = () => {
        const tipoEntregaEl = document.querySelector('input[name="tipo-entrega"]:checked');
        if (!tipoEntregaEl) return;
        const tipoEntrega = tipoEntregaEl.value;
        const nomeRetiradaInput = document.getElementById('retirada-nome');
        
        const cepInput = document.getElementById('endereco-cep'); 
        
        if (tipoEntrega === 'retirada') {
            if (containerFormEndereco) containerFormEndereco.style.display = 'none';
            if (containerFormRetirada) containerFormRetirada.style.display = 'block';
            if (nomeRetiradaInput) nomeRetiradaInput.required = true;
            if (cepInput) cepInput.required = false;
        } else {
            if (containerFormEndereco) containerFormEndereco.style.display = 'block';
            if (containerFormRetirada) containerFormRetirada.style.display = 'none';
            if (nomeRetiradaInput) nomeRetiradaInput.required = false;
            if (cepInput) cepInput.required = true;
        }
    };

    const finalizarEEnviarPedido = async () => {
        const btnTexto = document.querySelector('#btn-continuar-carrinho span:first-child');
        const btnOriginalText = btnTexto ? btnTexto.textContent : 'Finalizar Pedido';
        const btnCarrinho = btnContinuarCarrinho;

        if (btnTexto) btnTexto.textContent = 'Enviando...';
        if (btnCarrinho) btnCarrinho.disabled = true;

        try {
            const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value;
            let deliveryInfo, clientInfo;

            if (tipoEntrega === 'retirada') {
                deliveryInfo = { tipo: 'Retirada', rua: 'Retirar no local' };
                clientInfo = {
                    nome: document.getElementById('retirada-nome').value,
                    telefone: document.getElementById('retirada-telefone').value || 'Não informado'
                };
            } else {
                deliveryInfo = {
                    tipo: 'Entrega',
                    rua: document.getElementById('endereco-rua').value,
                    bairro: document.getElementById('endereco-bairro').value,
                    numero: document.getElementById('endereco-numero').value,
                    complemento: document.getElementById('endereco-complemento').value,
                    referencia: document.getElementById('endereco-referencia').value
                };
                clientInfo = {
                    nome: document.getElementById('cliente-nome').value,
                    telefone: document.getElementById('cliente-telefone').value || 'Não informado'
                };
            }

            const subtotal = carrinho.reduce((acc, item) => {
                const precoItemTotal = item.price + (item.adicionais ? item.adicionais.reduce((sum, ad) => sum + ad.price, 0) : 0);
                return acc + (precoItemTotal * item.quantity);
            }, 0);

            const taxaEntregaFinal = tipoEntrega === 'retirada' ? 0 : taxaDeEntrega;
            const total = subtotal + taxaEntregaFinal;

            const pedidoParaAPI = {
                client_info: clientInfo,
                delivery_info: deliveryInfo,
                items: carrinho,
                total_value: total,
                payment_info: pedido.pagamento,
                status: 'Novo'
            };

            const response = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoParaAPI),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Não foi possível enviar o pedido.');
            }

            const result = await response.json();
            console.log('Pedido enviado:', result);

            const historicoPedidos = JSON.parse(localStorage.getItem('pedidosZapEsfirras')) || [];
            const novoPedidoHistorico = {
                id: result.orderId,
                data: new Date().toISOString(),
                status: 'Novo',
                tipoEntrega: tipoEntrega === 'retirada' ? 'retirada' : 'padrao'
            };
            historicoPedidos.push(novoPedidoHistorico);
            localStorage.setItem('pedidosZapEsfirras', JSON.stringify(historicoPedidos));

            navegarCarrinho('sucesso');

            carrinho = [];
            salvarCarrinhoLocalStorage();
            renderizarItensCarrinho();

            setTimeout(() => {
                togglePainelCarrinho(false);
                setTimeout(() => {
                    if (btnTexto) btnTexto.textContent = btnOriginalText;
                    if (btnCarrinho) btnCarrinho.disabled = false;
                    navegarCarrinho('itens');
                }, 500);
            }, 3000);

        } catch (error) {
            console.error('Erro ao finalizar pedido:', error);
            mostrarNotificacao(error.message || 'Erro ao enviar pedido. Tente novamente.', 'error');
            if (btnTexto) btnTexto.textContent = btnOriginalText;
            if (btnCarrinho) btnCarrinho.disabled = false;
        }
    };

    async function init() {
        atualizarInfoCabecalho();
        ajustarPaddingCorpo();
        carregarCarrinhoLocalStorage();

        if (barraFiltros) {
            atualizarDisplayPagamento();
            gerenciarVisibilidadeFormEntrega();
            try {
                await carregarDadosDaAPI();
            } catch (e) {
                console.error("Falha fatal na inicialização ao carregar dados da API.", e)
            }
        }

        setTimeout(() => {
            if (telaCarregamento) {
                telaCarregamento.style.opacity = '0';
                telaCarregamento.addEventListener('transitionend', () => telaCarregamento.style.display = 'none');
            }
            if (conteudoPrincipal) {
                conteudoPrincipal.style.display = 'block';
                ajustarPaddingCorpo();
                if (barraFiltros) gerenciarSetasScroll();
            }
        }, 200);

        configurarEventListeners();
    }

    // --- BLOCO DE CÓDIGO PARA LÓGICA DE ENDEREÇO ---
    
    function configurarBuscaPorCEP() {
        const inputCEP = document.getElementById('endereco-cep');
        if (!inputCEP) return;

        inputCEP.addEventListener('input', (e) => {
            let cep = e.target.value.replace(/\D/g, '');
            cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = cep;

            if (cep.replace('-', '').length === 8) {
                buscarEnderecoPorCEP(cep);
            }
        });
    }

    async function buscarEnderecoPorCEP(cep) {
        const inputRua = document.getElementById('endereco-rua');
        const inputBairro = document.getElementById('endereco-bairro');
        
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep.replace('-', '')}`);
            if (!response.ok) throw new Error('CEP não encontrado.');
            
            const data = await response.json();

            inputRua.value = data.street;
            inputBairro.value = data.neighborhood;

            await calcularTaxaPorBairro(data.neighborhood);

        } catch (error) {
            console.error(error);
            mostrarNotificacao("CEP não encontrado. Verifique e tente novamente.", "error");
            inputRua.value = '';
            inputBairro.value = '';
        }
    }
    
    async function calcularTaxaPorBairro(bairro) {
        if (!bairro) {
            taxaDeEntrega = 5.00;
            atualizarTodosResumos();
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3000/api/calculate-delivery-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bairro: bairro })
            });

            if (!response.ok) throw new Error('Não foi possível calcular a taxa.');

            const data = await response.json();
            taxaDeEntrega = data.taxaDeEntrega;
            
            mostrarNotificacao(`Taxa de entrega para ${bairro}: R$ ${taxaDeEntrega.toFixed(2).replace('.',',')}`);
            atualizarTodosResumos();

        } catch (error) {
            console.error(error);
            mostrarNotificacao("Erro ao buscar taxa. Taxa padrão aplicada.", "error");
            taxaDeEntrega = 5.00;
            atualizarTodosResumos();
        }
    }

    function configurarEventListeners() {
        configurarBuscaPorCEP();

        if (secaoOpcoesEntrega) {
            secaoOpcoesEntrega.addEventListener('change', () => {
                gerenciarVisibilidadeFormEntrega();
                atualizarLinkWhatsapp();
            });
        }

        if (clienteNomeInput) clienteNomeInput.addEventListener('input', atualizarLinkWhatsapp);
        if (clienteTelefoneInput) clienteTelefoneInput.addEventListener('input', atualizarLinkWhatsapp);
        if (retiradaNomeInput) retiradaNomeInput.addEventListener('input', atualizarLinkWhatsapp);
        if (retiradaTelefoneInput) retiradaTelefoneInput.addEventListener('input', atualizarLinkWhatsapp);

        const painelPagamento = document.getElementById('tela-escolher-pagamento');
        if (painelPagamento) {
            painelPagamento.addEventListener('change', (e) => {
                if (e.target.name === 'forma-pagamento-principal') {
                    const subOpcoesDinheiro = document.getElementById('sub-opcoes-dinheiro');
                    const subOpcoesPix = document.getElementById('sub-opcoes-pix');
                    if (subOpcoesDinheiro) subOpcoesDinheiro.classList.toggle('visivel', e.target.value === 'dinheiro');
                    if (subOpcoesPix) subOpcoesPix.classList.toggle('visivel', e.target.value === 'pix');
                }
                if (e.target.name === 'precisa-troco' || e.target.name === 'sub-opcao-pix') {
                    const containerTroco = document.getElementById('container-troco');
                    const detalhesPix = document.getElementById('detalhes-pix-online');
                    if (containerTroco) containerTroco.classList.toggle('visivel', e.target.value === 'sim');
                    if (detalhesPix) detalhesPix.classList.toggle('visivel', e.target.value === 'online');
                }
            });
        }

        window.addEventListener('resize', ajustarPaddingCorpo);
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('.barra-navegacao');
            const topBar = document.querySelector('.barra-superior-info');
            if (!nav || !topBar) return;
            if (window.scrollY > topBar.offsetHeight) {
                nav.style.top = '0';
                nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
            } else {
                nav.style.top = '35px';
                nav.style.boxShadow = 'none';
            }
        });

        const mainContainer = document.querySelector('main.container-principal');
        if (mainContainer) {
            mainContainer.addEventListener('click', (e) => {
                const cartao = e.target.closest('.cartao-produto');
                if (!cartao) return;
                const produtoId = parseInt(cartao.dataset.id);
                const categoria = cartao.dataset.category;
                const produto = menuData[categoria]?.find(p => p.id === produtoId);
                if (!produto) return;
                if (e.target.closest('.botao-adicionar')) {
                    adicionarAoCarrinho(produto, 1, null, []);
                } else {
                    produtoAtualModal = { id: produto.id, name: produto.name, price: parseFloat(produto.price), image: produto.image, description: produto.description, precoBase: parseFloat(produto.price), precoFinal: parseFloat(produto.price) };
                    if (document.getElementById('imagem-produto-modal')) document.getElementById('imagem-produto-modal').src = produto.image;
                    if (document.getElementById('nome-produto-modal')) document.getElementById('nome-produto-modal').textContent = produto.name;
                    if (document.getElementById('desc-produto-modal')) document.getElementById('desc-produto-modal').textContent = produto.description;
                    if (document.querySelector('.modal-produto .entrada-quantidade')) document.querySelector('.modal-produto .entrada-quantidade').value = 1;
                    if (document.getElementById('observacao-produto')) document.getElementById('observacao-produto').value = '';
                    popularAdicionais(produto);
                    atualizarPrecoTotalModal();
                    if (sobreposicaoModal) sobreposicaoModal.classList.add('ativo');
                }
            });
        }

        todasEntradasPesquisa.forEach(input => {
            input.addEventListener('input', () => {
                const termo = input.value.toLowerCase().trim();
                todasEntradasPesquisa.forEach(outroInput => { if (outroInput !== input) outroInput.value = termo; });
                filtrarEBuscarProdutos(termo);
            });
        });

        const botaoPesquisa = document.querySelector('.acoes-navegacao .botao-pesquisa');
        if (botaoPesquisa) {
            botaoPesquisa.addEventListener('click', (e) => {
                e.preventDefault();
                const caixaPesquisa = botaoPesquisa.closest('.caixa-pesquisa');
                const inputPesquisa = caixaPesquisa.querySelector('.texto-pesquisa');
                caixaPesquisa.classList.toggle('ativo');
                if (caixaPesquisa.classList.contains('ativo')) {
                    inputPesquisa.focus();
                }
            });
        }

        if (barraFiltros) {
            barraFiltros.addEventListener('click', (e) => {
                if (e.target.classList.contains('botao-filtro')) {
                    barraFiltros.querySelector('.ativo')?.classList.remove('ativo');
                    e.target.classList.add('ativo');
                    filtrarPorCategoria(e.target.dataset.categoria);
                }
            });
            btnScrollLeft.addEventListener('click', () => barraFiltros.scrollBy({ left: -250, behavior: 'smooth' }));
            btnScrollRight.addEventListener('click', () => barraFiltros.scrollBy({ left: 250, behavior: 'smooth' }));
            barraFiltros.addEventListener('scroll', gerenciarSetasScroll);
        }

        const btnFecharModal = document.getElementById('botao-fechar-modal');
        if (btnFecharModal) btnFecharModal.addEventListener('click', () => sobreposicaoModal.classList.remove('ativo'));

        const btnAdicionarModal = document.querySelector('.botao-adicionar-carrinho-modal');
        if (btnAdicionarModal) btnAdicionarModal.addEventListener('click', () => {
            const adicionaisSelecionados = [];
            document.querySelectorAll('#lista-adicionais input:checked').forEach(checkbox => {
                adicionaisSelecionados.push({ name: checkbox.dataset.nome, price: parseFloat(checkbox.dataset.preco) });
            });
            const produtoParaCarrinho = { id: produtoAtualModal.id, name: produtoAtualModal.name, price: parseFloat(produtoAtualModal.precoFinal), image: produtoAtualModal.image };
            const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value);
            const observacao = document.getElementById('observacao-produto').value.trim();
            adicionarAoCarrinho(produtoParaCarrinho, quantidade, observacao || null, adicionaisSelecionados);
            sobreposicaoModal.classList.remove('ativo');
        });

        if (toggleAdicionaisBtn) toggleAdicionaisBtn.addEventListener('click', () => {
            toggleAdicionaisBtn.classList.toggle('ativo');
            listaAdicionaisContainer.classList.toggle('ativo');
        });

        if (listaAdicionaisContainer) listaAdicionaisContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                atualizarPrecoTotalModal();
            }
        });

        const btnMaisModal = document.querySelector('.modal-produto .botao-mais');
        if (btnMaisModal) btnMaisModal.addEventListener('click', () => {
            const input = document.querySelector('.modal-produto .entrada-quantidade');
            input.value = parseInt(input.value) + 1;
            atualizarPrecoTotalModal();
        });

        const btnMenosModal = document.querySelector('.modal-produto .botao-menos');
        if (btnMenosModal) btnMenosModal.addEventListener('click', () => {
            const input = document.querySelector('.modal-produto .entrada-quantidade');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
                atualizarPrecoTotalModal();
            }
        });

        const listaItensCarrinhoEl = document.getElementById('lista-itens-carrinho');
        if (listaItensCarrinhoEl) listaItensCarrinhoEl.addEventListener('click', (e) => {
            const itemEl = e.target.closest('.item-carrinho-novo');
            if (!itemEl) return;
            const idUnico = itemEl.dataset.idUnico;
            const itemNoCarrinho = carrinho.find(i => i.idUnico === idUnico);
            if (!itemNoCarrinho) return;

            if (e.target.closest('.aumentar-item')) {
                atualizarQuantidade(idUnico, itemNoCarrinho.quantity + 1);
            } else if (e.target.closest('.diminuir-item')) {
                atualizarQuantidade(idUnico, itemNoCarrinho.quantity - 1);
            } else if (e.target.closest('.botao-remover-item')) {
                removerItemDoCarrinho(idUnico);
            }
        });

        if (secaoPecaTambem) {
            secaoPecaTambem.addEventListener('click', (e) => {
                if (e.target.closest('.botao-add-sugestao')) {
                    const itemSugestao = e.target.closest('.item-sugestao');
                    const produtoId = parseInt(itemSugestao.dataset.id);
                    const categoria = itemSugestao.dataset.category;
                    const produto = menuData[categoria]?.find(p => p.id === produtoId);
                    if (produto) {
                        adicionarAoCarrinho(produto, 1, null, []);
                    }
                }
            });
        }

        if (btnCarrinhoMobile) btnCarrinhoMobile.addEventListener('click', () => togglePainelCarrinho(true));
        if (btnCarrinhoDesktop) btnCarrinhoDesktop.addEventListener('click', () => togglePainelCarrinho(true));

        const btnFecharPainel = document.getElementById('botao-fechar-painel-novo');
        if (btnFecharPainel) btnFecharPainel.addEventListener('click', () => togglePainelCarrinho(false));

        const btnAddMaisItens = document.getElementById('adicionar-mais-itens');
        if (btnAddMaisItens) btnAddMaisItens.addEventListener('click', (e) => { e.preventDefault(); togglePainelCarrinho(false); });

        if (sobreposicaoCarrinho) sobreposicaoCarrinho.addEventListener('click', () => togglePainelCarrinho(false));

        if (btnContinuarCarrinho) {
            btnContinuarCarrinho.addEventListener('click', () => {
                if (carrinho.length === 0) {
                    mostrarNotificacao("Sua sacola está vazia!");
                    return;
                }
                if (etapaAtualCarrinho === 'itens') {
                    navegarCarrinho('entrega');
                } else if (etapaAtualCarrinho === 'entrega') {
                    const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value;
                    let formValido = true;
                    if (tipoEntrega === 'padrao') {
                        const formEndereco = document.getElementById('form-endereco');
                        if (formEndereco) formValido = formEndereco.checkValidity();
                        if (!formValido && formEndereco) formEndereco.reportValidity();
                    } else {
                        const formRetirada = document.getElementById('form-retirada');
                        if (formRetirada) formValido = formRetirada.checkValidity();
                        if (!formValido && formRetirada) formRetirada.reportValidity();
                    }
                    if (formValido) navegarCarrinho('pagamento');

                } else if (etapaAtualCarrinho === 'pagamento') {
                    finalizarEEnviarPedido();
                }
                else if (etapaAtualCarrinho === 'escolher-pagamento') {
                    const metodo = document.querySelector('input[name="forma-pagamento-principal"]:checked').value;

                    if (metodo === 'pix') {
                        pedido.pagamento = {
                            metodo: 'Pix',
                            tipo: document.querySelector('input[name="sub-opcao-pix"]:checked').value
                        };
                    } else if (metodo === 'cartao') {
                        pedido.pagamento = {
                            metodo: 'Cartão',
                            tipo: document.querySelector('input[name="sub-opcao-cartao"]:checked').value === 'credito' ? 'Crédito' : 'Débito'
                        };
                    } else if (metodo === 'dinheiro') {
                        const precisaTroco = document.querySelector('input[name="precisa-troco"]:checked').value === 'sim';
                        if (precisaTroco) {
                            const valorTrocoInput = document.getElementById('valor-troco').value.replace(',', '.');
                            const trocoPara = parseFloat(valorTrocoInput);
                            pedido.pagamento = { metodo: 'Dinheiro', trocoPara: isNaN(trocoPara) ? 0 : trocoPara, tipo: `Troco para R$${valorTrocoInput}` };
                        } else {
                            pedido.pagamento = { metodo: 'Dinheiro', trocoPara: 0, tipo: 'Não precisa de troco' };
                        }
                    }

                    atualizarDisplayPagamento();
                    navegarCarrinho('pagamento');
                }
            });
        }

        if (btnVoltarCarrinho) btnVoltarCarrinho.addEventListener('click', () => {
            if (etapaAtualCarrinho === 'pagamento') navegarCarrinho('entrega');
            else if (etapaAtualCarrinho === 'entrega') navegarCarrinho('itens');
            else if (etapaAtualCarrinho === 'escolher-pagamento') navegarCarrinho('pagamento');
        });
    }

    init();
});