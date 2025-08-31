document.addEventListener('DOMContentLoaded', () => {

    // =======================================================
    // --- ESTADO DA APLICAÇÃO E CONSTANTES GLOBAIS ---
    // =======================================================
    let carrinho = [];
    const TAXA_ENTREGA = 5.00;
    let produtoAtualModal = {}; // Alterado para objeto para guardar mais infos
    let timeoutNotificacao;
    let etapaAtualCarrinho = 'itens';
    let pedido = {
        pagamento: { metodo: 'Cartão', tipo: 'Crédito' }
    };

    // --- NOVA CONSTANTE PARA ADICIONAIS ---
    // Você pode customizar os adicionais para cada categoria aqui
    const adicionaisPorCategoria = {
        'Salgadas': [
            { nome: 'Bacon', preco: 3.50 },
            { nome: 'Catupiry Extra', preco: 3.00 },
            { nome: 'Cheddar', preco: 3.00 },
            { nome: 'Alho Frito', preco: 2.00 }
        ],
        'Beirutes': [
            { nome: 'Ovo', preco: 2.50 },
            { nome: 'Bacon', preco: 4.00 },
            { nome: 'Catupiry', preco: 3.50 },
            { nome: 'Dobro de Queijo', preco: 5.00 }
        ],
        'Lanches': [
            { nome: 'Ovo', preco: 2.50 },
            { nome: 'Bacon', preco: 4.00 },
            { nome: 'Cheddar', preco: 3.00 },
            { nome: 'Hambúrguer Extra', preco: 6.00 }
        ],
        // Categoria padrão para itens que não se encaixam
        'default': [
            { nome: 'Bacon', preco: 3.50 },
            { nome: 'Cheddar', preco: 3.00 },
            { nome: 'Catupiry', preco: 3.00 },
        ]
    };

    // =======================================================
    // --- SELETORES DE ELEMENTOS (DOM) ---
    // =======================================================
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
    const opcoesPagamentoPrincipal = document.querySelectorAll('input[name="forma-pagamento-principal"]');
    const subOpcoesPix = document.getElementById('sub-opcoes-pix');
    const subOpcoesCartao = document.getElementById('sub-opcoes-cartao');
    const radiosSubOpcoesPix = document.querySelectorAll('input[name="sub-opcao-pix"]');
    const detalhesPixOnline = document.getElementById('detalhes-pix-online');
    const radiosTipoEntrega = document.querySelectorAll('input[name="tipo-entrega"]');
    const formEnderecoContainer = document.getElementById('container-form-endereco');
    const formEndereco = document.getElementById('form-endereco');
    const inputsEndereco = formEndereco.querySelectorAll('input');
    const todasEntradasPesquisa = document.querySelectorAll('.texto-pesquisa');
    const mensagemSemResultados = document.getElementById('sem-resultados');
    const todosCartoesProduto = document.querySelectorAll('.cartao-produto');
    const secaoPecaTambem = document.querySelector('.secao-peca-tambem');
    const secoesProdutos = document.querySelectorAll('.container-secao[data-category]');
    const barraFiltros = document.querySelector('.barra-filtros');
    const btnScrollLeft = document.getElementById('scroll-left');
    const btnScrollRight = document.getElementById('scroll-right');
    const btnCarrinhoMobile = document.getElementById('botao-carrinho-mobile');
    const contadorCarrinhoMobileEl = document.getElementById('contador-carrinho-mobile');
    const btnCarrinhoDesktop = document.getElementById('botao-carrinho-desktop');
    const contadorCarrinhoDesktopEl = document.getElementById('contador-carrinho-desktop');
    const toggleAdicionaisBtn = document.getElementById('toggle-adicionais');
    const listaAdicionaisContainer = document.getElementById('lista-adicionais');


    // =======================================================
    // --- FUNÇÕES PRINCIPAIS DA APLICAÇÃO ---
    // =======================================================

    /**
     * Atualiza a saudação (Bom dia, etc.) e a data nos cabeçalhos.
     */
    function atualizarInfoCabecalho() {
        const greetingEl = document.getElementById('greeting');
        const dateEl = document.getElementById('current-date');
        // ================= ALTERAÇÃO AQUI =================
        const mobileGreetingContainer = document.getElementById('header-greeting-mobile');
        // ================= FIM DA ALTERAÇÃO =================

        if (!greetingEl || !dateEl) return;

        const agora = new Date();
        const hora = agora.getHours();
        let saudacao;
        if (hora >= 5 && hora < 12) { saudacao = 'Bom dia!'; } 
        else if (hora >= 12 && hora < 18) { saudacao = 'Boa tarde!'; } 
        else { saudacao = 'Boa noite!'; }
        
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
        const navBar = document.querySelector('.barra-navegacao');
        if (navBar) {
            const alturaTotalOcupada = navBar.getBoundingClientRect().bottom;
            document.body.style.paddingTop = `${alturaTotalOcupada}px`;
        }
    }

    function filtrarEBuscarProdutos(termo) {
        let produtoEncontrado = false;
        todosCartoesProduto.forEach(cartao => {
            const nomeProduto = cartao.dataset.nome.toLowerCase();
            const deveMostrar = nomeProduto.includes(termo);
            cartao.style.display = deveMostrar ? 'flex' : 'none';
            if (deveMostrar) produtoEncontrado = true;
        });

        document.querySelectorAll('.container-secao[data-category]').forEach(secao => {
            const produtosVisiveis = secao.querySelectorAll('.cartao-produto[style*="display: flex"]').length;
            secao.style.display = produtosVisiveis > 0 || termo === '' ? 'block' : 'none';
        });

        if (mensagemSemResultados) {
            mensagemSemResultados.style.display = !produtoEncontrado && termo !== '' ? 'block' : 'none';
        }
    }

    function filtrarPorCategoria(categoriaAlvo) {
        secoesProdutos.forEach(secao => {
            const categoriaDaSecao = secao.dataset.category;
            if (categoriaDaSecao === 'Destaques') {
                secao.style.display = (categoriaAlvo === 'Todos') ? 'block' : 'none';
            } else {
                secao.style.display = (categoriaAlvo === 'Todos' || categoriaDaSecao === categoriaAlvo) ? 'block' : 'none';
            }
        });
        todasEntradasPesquisa.forEach(input => input.value = '');
        todosCartoesProduto.forEach(cartao => cartao.style.display = 'flex');
        if (mensagemSemResultados) mensagemSemResultados.style.display = 'none';
    }
    
    function mostrarNotificacao(mensagem) {
        if (!notificacao || !textoNotificacao) return;
        clearTimeout(timeoutNotificacao);
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

    // --- FUNÇÕES DO MODAL ---
    function atualizarPrecoTotalModal() {
        const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value);
        let precoAdicionais = 0;
        
        const adicionaisSelecionados = document.querySelectorAll('#lista-adicionais input[type="checkbox"]:checked');
        adicionaisSelecionados.forEach(checkbox => {
            precoAdicionais += parseFloat(checkbox.dataset.preco);
        });

        const precoUnitarioFinal = produtoAtualModal.precoBase + precoAdicionais;
        const precoTotal = precoUnitarioFinal * quantidade;

        produtoAtualModal.precoFinal = precoUnitarioFinal; 

        document.querySelector('.botao-adicionar-carrinho-modal').textContent = `Adicionar R$ ${precoTotal.toFixed(2).replace('.', ',')}`;
    }

    function popularAdicionais(categoria) {
        listaAdicionaisContainer.innerHTML = '';
        toggleAdicionaisBtn.classList.remove('ativo');
        listaAdicionaisContainer.classList.remove('ativo');

        const adicionais = adicionaisPorCategoria[categoria] || adicionaisPorCategoria['default'];

        if (adicionais && adicionais.length > 0) {
            adicionais.forEach((adicional, index) => {
                const itemHTML = `
                    <div class="item-adicional">
                        <label for="adicional-${index}">
                            <input type="checkbox" id="adicional-${index}" data-nome="${adicional.nome}" data-preco="${adicional.preco}">
                            <span class="checkmark-adicional"></span>
                            <span class="nome-adicional">${adicional.nome}</span>
                        </label>
                        <span class="preco-adicional">+ R$ ${adicional.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                `;
                listaAdicionaisContainer.insertAdjacentHTML('beforeend', itemHTML);
            });
            document.querySelector('.area-adicionais').style.display = 'block';
        } else {
            document.querySelector('.area-adicionais').style.display = 'none';
        }
    }


    // --- FUNÇÕES DO CARRINHO ---
    const salvarCarrinhoLocalStorage = () => localStorage.setItem('carrinhoZapEsfirras', JSON.stringify(carrinho));
    const carregarCarrinhoLocalStorage = () => {
        carrinho = JSON.parse(localStorage.getItem('carrinhoZapEsfirras')) || [];
        renderizarItensCarrinho();
    };

    const adicionarAoCarrinho = (produto, quantidade = 1, observacao = null, adicionais = []) => {
        const nomesAdicionais = adicionais.map(a => a.nome).sort().join(',');
        const idUnicoItem = produto.nome + (observacao || '').trim().toLowerCase() + nomesAdicionais;

        const itemExistente = carrinho.find(item => item.idUnico === idUnicoItem);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ ...produto, quantidade, observacao, adicionais, idUnico: idUnicoItem });
        }
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
        mostrarNotificacao(`${quantidade} "${produto.nome}" adicionado(s)!`);
    };

    const atualizarQuantidade = (idUnico, novaQuantidade) => {
        const itemIndex = carrinho.findIndex(item => item.idUnico === idUnico);
        if (itemIndex > -1) {
            if (novaQuantidade > 0) {
                carrinho[itemIndex].quantidade = novaQuantidade;
            } else {
                carrinho.splice(itemIndex, 1);
            }
            salvarCarrinhoLocalStorage();
            renderizarItensCarrinho();
        }
    };

    const removerItemDoCarrinho = (idUnico) => {
        carrinho = carrinho.filter(item => item.idUnico !== idUnico);
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
    };

    const renderizarItensCarrinho = () => {
        const container = document.getElementById('lista-itens-carrinho');
        if (!container) return;
        if (carrinho.length === 0) {
            container.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>';
        } else {
            container.innerHTML = carrinho.map(item => `
                <div class="item-carrinho-novo" data-id-unico="${item.idUnico}">
                    <img src="${item.imagem}" alt="${item.nome}">
                    <div class="info-item">
                        <p class="nome-item">${item.nome}</p>
                        ${item.adicionais && item.adicionais.length > 0 ? `
                            <div class="adicionais-carrinho">
                                ${item.adicionais.map(ad => `<span>+ ${ad.nome}</span>`).join('')}
                            </div>
                        ` : ''}
                        <span class="preco-unitario-item">R$ ${item.preco.toFixed(2).replace('.',',')}</span>
                        ${item.observacao ? `<p class="observacao-item">Obs: ${item.observacao}</p>` : ''}
                    </div>
                    <div class="acoes-item">
                        <div class="seletor-quantidade-carrinho">
                            <button class="diminuir-item">-</button>
                            <span>${item.quantidade}</span>
                            <button class="aumentar-item">+</button>
                        </div>
                        <button class="botao-remover-item">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        atualizarTodosResumos();
    };
    
    const atualizarTodosResumos = () => {
        const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value;
        const taxaEntrega = tipoEntrega === 'retirada' || carrinho.length === 0 ? 0 : TAXA_ENTREGA;
        const total = subtotal + taxaEntrega;
        const resumoHTML = `
            <div class="linha-resumo">
                <span>Subtotal</span>
                <span>R$ ${subtotal.toFixed(2).replace('.',',')}</span>
            </div>
            <div class="linha-resumo">
                <span>Taxa de entrega</span>
                <span>R$ ${taxaEntrega.toFixed(2).replace('.',',')}</span>
            </div>
            <div class="linha-resumo total">
                <span>Total</span>
                <span>R$ ${total.toFixed(2).replace('.',',')}</span>
            </div>
        `;
        document.getElementById('resumo-tela-itens').innerHTML = resumoHTML;
        document.getElementById('resumo-tela-entrega').innerHTML = resumoHTML;
        document.getElementById('resumo-tela-pagamento').innerHTML = resumoHTML;
        document.getElementById('total-botao-carrinho').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        
        const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

        if (contadorCarrinhoMobileEl) {
            contadorCarrinhoMobileEl.textContent = totalItens;
            contadorCarrinhoMobileEl.classList.toggle('ativo', totalItens > 0);
        }
        if (contadorCarrinhoDesktopEl) {
            contadorCarrinhoDesktopEl.textContent = totalItens;
            contadorCarrinhoDesktopEl.classList.toggle('ativo', totalItens > 0);
        }
    };
    
    const atualizarDisplayPagamento = () => {
        const container = document.getElementById('card-info-pagamento');
        if (!container) return;
        let iconName = 'card-outline';
        let titulo = '';
        let subtitulo = '';
        if (pedido.pagamento.metodo === 'Pix') {
            iconName = 'cash-outline';
            titulo = 'Pix';
            subtitulo = pedido.pagamento.tipo === 'online' ? 'Pagamento online via PIX' : 'Pagar na entrega';
        } else {
            iconName = 'card-outline';
            titulo = `Cartão de ${pedido.pagamento.tipo}`;
            subtitulo = 'Pagamento na entrega';
        }
        container.innerHTML = `
            <ion-icon name="${iconName}"></ion-icon>
            <div class="card-info-texto">
                <p>${titulo}</p>
                <span>${subtitulo}</span>
            </div>
            <a href="#" id="btn-trocar-pagamento">Trocar</a>
        `;
        document.getElementById('btn-trocar-pagamento').addEventListener('click', (e) => {
            e.preventDefault();
            navegarCarrinho('escolher-pagamento');
        });
    };

    const navegarCarrinho = (novaEtapa) => {
        etapaAtualCarrinho = novaEtapa;
        telasCarrinho.forEach(tela => tela.classList.toggle('tela-ativa', tela.id === `tela-${novaEtapa}`));
        const textoBotao = document.querySelector('#btn-continuar-carrinho span:first-child');
        switch (novaEtapa) {
            case 'itens':
                tituloCarrinho.textContent = 'Meu Carrinho';
                btnVoltarCarrinho.style.display = 'none';
                textoBotao.textContent = 'Continuar';
                break;
            case 'entrega':
                tituloCarrinho.textContent = 'Endereço e Entrega';
                btnVoltarCarrinho.style.display = 'block';
                textoBotao.textContent = 'Ir para o Pagamento';
                break;
            case 'pagamento':
                tituloCarrinho.textContent = 'Pagamento';
                btnVoltarCarrinho.style.display = 'block';
                textoBotao.textContent = 'Finalizar Pedido';
                break;
            case 'escolher-pagamento':
                tituloCarrinho.textContent = 'Forma de Pagamento';
                btnVoltarCarrinho.style.display = 'block';
                textoBotao.textContent = 'Confirmar Seleção';
                break;
        }
        atualizarTodosResumos();
    };

    const togglePainelCarrinho = (abrir = null) => {
        const ativo = abrir === null ? !painelCarrinho.classList.contains('ativo') : abrir;
        if (ativo) navegarCarrinho('itens');
        painelCarrinho.classList.toggle('ativo', ativo);
        sobreposicaoCarrinho.classList.toggle('ativo', ativo);
    };

    // =======================================================
    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    // =======================================================

    setTimeout(() => {
        if (telaCarregamento) {
            telaCarregamento.style.opacity = '0';
            telaCarregamento.addEventListener('transitionend', () => telaCarregamento.style.display = 'none');
        }
        if (conteudoPrincipal) {
            conteudoPrincipal.style.display = 'block';
            ajustarPaddingCorpo();
            gerenciarSetasScroll();
        }
    }, 500);

    window.addEventListener('resize', ajustarPaddingCorpo);
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.barra-navegacao');
        const topBar = document.querySelector('.barra-superior-info');
        if (!nav || !topBar) return;
        
        if (window.scrollY > 10) {
            nav.style.top = '0';
            topBar.style.display = 'none';
        } else {
            nav.style.top = '35px';
            topBar.style.display = 'block';
        }
    });

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
    
    document.querySelector('.container-principal').addEventListener('click', (e) => {
        const cartao = e.target.closest('.cartao-produto');
        if (!cartao) return;

        const categoria = cartao.closest('.container-secao').dataset.category;

        if (e.target.closest('.botao-adicionar')) {
            adicionarAoCarrinho({
                nome: cartao.dataset.nome,
                preco: parseFloat(cartao.dataset.preco),
                imagem: cartao.querySelector('img').src,
            }, 1, null, []); // Adiciona sem adicionais
        } else {
            produtoAtualModal = {
                nome: cartao.dataset.nome,
                precoBase: parseFloat(cartao.dataset.preco),
                precoFinal: parseFloat(cartao.dataset.preco),
                imagem: cartao.querySelector('img').src
            };
            
            document.getElementById('imagem-produto-modal').src = cartao.querySelector('img').src;
            document.getElementById('nome-produto-modal').textContent = cartao.dataset.nome;
            document.getElementById('desc-produto-modal').textContent = cartao.dataset.desc;
            document.getElementById('detalhes-produto-modal').textContent = cartao.dataset.detalhes;
            document.querySelector('.modal-produto .entrada-quantidade').value = 1;
            document.getElementById('observacao-produto').value = '';
            
            popularAdicionais(categoria);
            atualizarPrecoTotalModal();
            sobreposicaoModal.classList.add('ativo');
        }
    });

    // LISTENERS DO MODAL
    document.getElementById('botao-fechar-modal').addEventListener('click', () => sobreposicaoModal.classList.remove('ativo'));
    
    document.querySelector('.botao-adicionar-carrinho-modal').addEventListener('click', () => {
        const adicionaisSelecionados = [];
        document.querySelectorAll('#lista-adicionais input:checked').forEach(checkbox => {
            adicionaisSelecionados.push({
                nome: checkbox.dataset.nome,
                preco: parseFloat(checkbox.dataset.preco)
            });
        });

        const produtoParaCarrinho = {
            nome: produtoAtualModal.nome,
            preco: produtoAtualModal.precoFinal,
            imagem: produtoAtualModal.imagem
        };
        const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value);
        const observacao = document.getElementById('observacao-produto').value.trim();
        
        adicionarAoCarrinho(produtoParaCarrinho, quantidade, observacao || null, adicionaisSelecionados);
        
        sobreposicaoModal.classList.remove('ativo');
    });

    toggleAdicionaisBtn.addEventListener('click', () => {
        toggleAdicionaisBtn.classList.toggle('ativo');
        listaAdicionaisContainer.classList.toggle('ativo');
    });

    listaAdicionaisContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            atualizarPrecoTotalModal();
        }
    });

    document.querySelector('.modal-produto .botao-mais').addEventListener('click', () => {
        const input = document.querySelector('.modal-produto .entrada-quantidade');
        input.value = parseInt(input.value) + 1;
        atualizarPrecoTotalModal();
    });
    document.querySelector('.modal-produto .botao-menos').addEventListener('click', () => {
        const input = document.querySelector('.modal-produto .entrada-quantidade');
        if (parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
            atualizarPrecoTotalModal();
        }
    });

    // LISTENERS DO CARRINHO
    document.getElementById('lista-itens-carrinho').addEventListener('click', (e) => {
        const itemEl = e.target.closest('.item-carrinho-novo');
        if (!itemEl) return;
        const idUnico = itemEl.dataset.idUnico;
        if (e.target.closest('.aumentar-item')) {
            atualizarQuantidade(idUnico, carrinho.find(i => i.idUnico === idUnico).quantidade + 1);
        } else if (e.target.closest('.diminuir-item')) {
            atualizarQuantidade(idUnico, carrinho.find(i => i.idUnico === idUnico).quantidade - 1);
        } else if (e.target.closest('.botao-remover-item')) {
            removerItemDoCarrinho(idUnico);
        }
    });
    if (secaoPecaTambem) {
        secaoPecaTambem.addEventListener('click', (e) => {
            if (e.target.closest('.botao-add-sugestao')) {
                const itemSugestao = e.target.closest('.item-sugestao');
                adicionarAoCarrinho({
                    nome: itemSugestao.dataset.nome,
                    preco: parseFloat(itemSugestao.dataset.preco),
                    imagem: itemSugestao.querySelector('img').src
                }, 1, null, []);
            }
        });
    }
    
    if (btnCarrinhoMobile) btnCarrinhoMobile.addEventListener('click', () => togglePainelCarrinho(true));
    if (btnCarrinhoDesktop) btnCarrinhoDesktop.addEventListener('click', () => togglePainelCarrinho(true));

    document.getElementById('botao-fechar-painel-novo').addEventListener('click', () => togglePainelCarrinho(false));
    document.getElementById('adicionar-mais-itens').addEventListener('click', (e) => { e.preventDefault(); togglePainelCarrinho(false); });
    sobreposicaoCarrinho.addEventListener('click', () => togglePainelCarrinho(false));
    
    btnContinuarCarrinho.addEventListener('click', () => {
        if (carrinho.length === 0) {
            mostrarNotificacao("Sua sacola está vazia!");
            return;
        }
        if (etapaAtualCarrinho === 'itens') {
            navegarCarrinho('entrega');
        } else if (etapaAtualCarrinho === 'entrega') {
            if (document.querySelector('input[name="tipo-entrega"]:checked').value === 'padrao' && !formEndereco.checkValidity()) {
                formEndereco.reportValidity();
                return;
            }
            navegarCarrinho('pagamento');
        } else if (etapaAtualCarrinho === 'pagamento') {
            alert('Pedido Enviado com sucesso! Em breve você receberá uma confirmação no WhatsApp.');
            carrinho = [];
            salvarCarrinhoLocalStorage();
            renderizarItensCarrinho();
            togglePainelCarrinho(false);
        } else if (etapaAtualCarrinho === 'escolher-pagamento') {
             const metodo = document.querySelector('input[name="forma-pagamento-principal"]:checked').value;
               pedido.pagamento.metodo = metodo === 'pix' ? 'Pix' : 'Cartão';
               if (metodo === 'pix') {
                     pedido.pagamento.tipo = document.querySelector('input[name="sub-opcao-pix"]:checked').value;
               } else {
                     pedido.pagamento.tipo = document.querySelector('input[name="sub-opcao-cartao"]:checked').value === 'credito' ? 'Crédito' : 'Débito';
               }
               atualizarDisplayPagamento();
               navegarCarrinho('pagamento');
        }
    });
    btnVoltarCarrinho.addEventListener('click', () => {
        if (etapaAtualCarrinho === 'pagamento') navegarCarrinho('entrega');
        else if (etapaAtualCarrinho === 'entrega') navegarCarrinho('itens');
        else if (etapaAtualCarrinho === 'escolher-pagamento') navegarCarrinho('pagamento');
    });
    radiosTipoEntrega.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isEntrega = e.target.value === 'padrao';
            formEnderecoContainer.classList.toggle('escondido', !isEntrega);
            inputsEndereco.forEach(input => {
                if (input.id !== 'endereco-complemento') input.required = isEntrega;
            });
            atualizarTodosResumos();
        });
    });
    opcoesPagamentoPrincipal.forEach(radio => {
        radio.addEventListener('change', () => {
            const selecionado = document.querySelector('input[name="forma-pagamento-principal"]:checked').value;
            subOpcoesPix.classList.toggle('visivel', selecionado === 'pix');
            subOpcoesCartao.classList.toggle('visivel', selecionado === 'cartao');
        });
    });
    radiosSubOpcoesPix.forEach(radio => {
        radio.addEventListener('change', () => {
            const selecionado = document.querySelector('input[name="sub-opcao-pix"]:checked').value;
            detalhesPixOnline.classList.toggle('visivel', selecionado === 'online');
        });
    });
    document.getElementById('add-cpf').addEventListener('change', function() {
        document.querySelector('.input-cpf-container').classList.toggle('visivel', this.checked);
    });

    // CHAMADAS DE FUNÇÕES INICIAIS
    atualizarInfoCabecalho();
    ajustarPaddingCorpo();
    carregarCarrinhoLocalStorage();
    atualizarDisplayPagamento();
});