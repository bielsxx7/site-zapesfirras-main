document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // ESTADO DA APLICAÇÃO E CONSTANTES
    // =================================================================
    let carrinho = [];
    const TAXA_ENTREGA = 5.00;
    // TAXA_SERVICO removida
    let precoProdutoAtualModal = 0;
    let timeoutNotificacao;
    let etapaAtualCarrinho = 'itens';

    // =================================================================
    // SELETORES DE ELEMENTOS
    // =================================================================
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const barraNavegacao = document.querySelector('.barra-navegacao');
    const menuHamburguer = document.querySelector('.menu-hamburguer');
    const menuNavegacao = document.querySelector('.menu-navegacao');
    const sobreposicaoModal = document.getElementById('modal-sobreposicao');
    const notificacao = document.getElementById('notificacao');
    const textoNotificacao = document.getElementById('texto-notificacao');
    const painelCarrinho = document.getElementById('painel-carrinho');
    const sobreposicaoCarrinho = document.getElementById('sobreposicao-carrinho');
    const contadorCarrinhoEl = document.getElementById('contador-carrinho');
    const modalConfirmacao = document.getElementById('modal-confirmacao-pedido');
    const tituloCarrinho = document.getElementById('titulo-carrinho');
    const btnVoltarCarrinho = document.getElementById('btn-voltar-carrinho');
    const btnContinuarCarrinho = document.getElementById('btn-continuar-carrinho');
    const telasCarrinho = document.querySelectorAll('.tela-carrinho');
    const radiosTipoEntrega = document.querySelectorAll('input[name="tipo-entrega"]');
    const formEnderecoContainer = document.getElementById('container-form-endereco');
    const formEndereco = document.getElementById('form-endereco');
    const inputsEndereco = formEndereco.querySelectorAll('input');
    const todasEntradasPesquisa = document.querySelectorAll('.texto-pesquisa');
    const mensagemSemResultados = document.getElementById('sem-resultados');
    const todosCartoesProduto = document.querySelectorAll('.cartao-produto');
    const secaoPecaTambem = document.querySelector('.secao-peca-tambem');

    // =================================================================
    // INICIALIZAÇÃO E LÓGICAS DE LAYOUT
    // =================================================================
    function ajustarPaddingCorpo() {
        if (barraNavegacao) {
            const alturaHeader = barraNavegacao.offsetHeight;
            const pesquisaMobile = document.querySelector('.container-pesquisa-mobile');
            let alturaTotal = alturaHeader;
            if (window.getComputedStyle(pesquisaMobile).display !== 'none') {
                alturaTotal += pesquisaMobile.offsetHeight;
            }
            document.body.style.paddingTop = `${alturaTotal}px`;
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
        }
    }, 2000);

    window.addEventListener('resize', ajustarPaddingCorpo);
    if (menuHamburguer) menuHamburguer.addEventListener('click', () => menuNavegacao.classList.toggle('ativo'));
    
    // =================================================================
    // LÓGICA DE BUSCA APRIMORADA
    // =================================================================
    function filtrarEBuscarProdutos(termo) {
        let produtoEncontrado = false;
        let primeiroProdutoEncontradoEl = null;

        // Filtra a visibilidade dos produtos
        todosCartoesProduto.forEach(cartao => {
            const nomeProduto = cartao.dataset.nome.toLowerCase();
            const deveMostrar = nomeProduto.includes(termo);
            cartao.style.display = deveMostrar ? 'flex' : 'none';
            if (deveMostrar) {
                produtoEncontrado = true;
                if (!primeiroProdutoEncontradoEl) {
                    primeiroProdutoEncontradoEl = cartao;
                }
            }
        });

        // Mostra ou esconde seções inteiras
        document.querySelectorAll('.container-secao:not(:has(.carrossel-categorias))').forEach(secao => {
            const produtosVisiveis = secao.querySelectorAll('.cartao-produto[style*="display: flex"]').length;
            secao.style.display = produtosVisiveis > 0 || termo === '' ? 'block' : 'none';
        });

        // Mostra mensagem de "não encontrado"
        if (mensagemSemResultados) {
            mensagemSemResultados.style.display = !produtoEncontrado && termo !== '' ? 'block' : 'none';
        }

        // Rola até o primeiro produto encontrado
        if (primeiroProdutoEncontradoEl) {
            primeiroProdutoEncontradoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    todasEntradasPesquisa.forEach(input => {
        input.addEventListener('input', () => {
            const termo = input.value.toLowerCase().trim();
            todasEntradasPesquisa.forEach(outroInput => { if (outroInput !== input) outroInput.value = input.value; });
            filtrarEBuscarProdutos(termo);
        });
    });
    
    // =================================================================
    // LÓGICA DO MODAL DE PRODUTOS
    // =================================================================
    // ... (código do modal permanece o mesmo)

    // =================================================================
    // LÓGICA DO NOVO CARRINHO
    // =================================================================
    const navegarCarrinho = (novaEtapa) => {
        etapaAtualCarrinho = novaEtapa;
        telasCarrinho.forEach(tela => {
            tela.classList.toggle('tela-ativa', tela.id === `tela-${novaEtapa}`);
        });

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
        }
        atualizarTodosResumos();
    };

    const adicionarAoCarrinho = (produto, quantidade = 1, observacao = null) => {
        const idUnicoItem = produto.nome + (observacao || '').trim().toLowerCase();
        const itemExistente = carrinho.find(item => item.idUnico === idUnicoItem);

        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ ...produto, quantidade, observacao, idUnico: idUnicoItem });
        }
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
        mostrarNotificacao(`${quantidade} "${produto.nome}" adicionado(s)!`);
    };

    const atualizarQuantidade = (idUnico, novaQuantidade) => {
        const itemIndex = carrinho.findIndex(item => item.idUnico === idUnico);
        if (itemIndex === -1) return;

        if (novaQuantidade > 0) {
            carrinho[itemIndex].quantidade = novaQuantidade;
        } else {
            carrinho.splice(itemIndex, 1);
        }
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
    };

    const removerItemDoCarrinho = (idUnico) => {
        carrinho = carrinho.filter(item => item.idUnico !== idUnico);
        salvarCarrinhoLocalStorage();
        renderizarItensCarrinho();
    };
    
    const renderizarItensCarrinho = () => {
        const container = document.getElementById('lista-itens-carrinho');
        if (carrinho.length === 0) {
            container.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>';
        } else {
            container.innerHTML = carrinho.map(item => `
                <div class="item-carrinho-novo" data-id-unico="${item.idUnico}">
                    <img src="${item.imagem}" alt="${item.nome}">
                    <div class="info-item">
                        <p class="nome-item">${item.nome}</p>
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
        const tipoEntregaSelecionado = document.querySelector('input[name="tipo-entrega"]:checked')?.value;
        const taxaEntregaAtual = tipoEntregaSelecionado === 'retirada' ? 0 : TAXA_ENTREGA;
        
        const total = subtotal + taxaEntregaAtual;

        const resumoHTML = `
            <div class="linha-resumo">
                <span>Subtotal</span>
                <span>R$ ${subtotal.toFixed(2).replace('.',',')}</span>
            </div>
            <div class="linha-resumo">
                <span>Taxa de entrega</span>
                <span>R$ ${taxaEntregaAtual.toFixed(2).replace('.',',')}</span>
            </div>
            <div class="linha-resumo total">
                <span>Total</span>
                <span>R$ ${total.toFixed(2).replace('.',',')}</span>
            </div>
        `;
        
        document.getElementById('resumo-tela-itens').innerHTML = resumoHTML;
        document.getElementById('resumo-tela-entrega').innerHTML = resumoHTML;
        document.getElementById('resumo-tela-pagamento').innerHTML = resumoHTML;
        document.getElementById('total-botao-carrinho').textContent = `R$ ${total.toFixed(2).replace('.',',')}`;

        const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        contadorCarrinhoEl.textContent = totalItens;
        contadorCarrinhoEl.classList.toggle('ativo', totalItens > 0);
    };

    const togglePainelCarrinho = (abrir = null) => {
        const ativo = abrir === null ? !painelCarrinho.classList.contains('ativo') : abrir;
        if (ativo) {
            navegarCarrinho('itens');
        }
        painelCarrinho.classList.toggle('ativo', ativo);
        sobreposicaoCarrinho.classList.toggle('ativo', ativo);
    };

    const salvarCarrinhoLocalStorage = () => localStorage.setItem('carrinhoZapEsfirras', JSON.stringify(carrinho));
    const carregarCarrinhoLocalStorage = () => {
        const carrinhoSalvo = localStorage.getItem('carrinhoZapEsfirras');
        carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
        renderizarItensCarrinho();
    };

    function mostrarNotificacao(mensagem) {
        if (!notificacao || !textoNotificacao) return;
        clearTimeout(timeoutNotificacao);
        textoNotificacao.textContent = mensagem;
        notificacao.classList.add('mostrar');
        timeoutNotificacao = setTimeout(() => notificacao.classList.remove('mostrar'), 2500);
    }
    
    // =================================================================
    // EVENT LISTENERS GERAIS E INTEGRAÇÕES
    // =================================================================

    document.querySelector('.container-principal').addEventListener('click', (e) => {
        const botaoDetalhes = e.target.closest('.botao-detalhes');
        if (botaoDetalhes) {
            const cartao = botaoDetalhes.closest('.cartao-produto');
            if (!cartao) return;

            precoProdutoAtualModal = parseFloat(cartao.dataset.preco);
            document.getElementById('imagem-produto-modal').src = cartao.querySelector('img').src;
            document.getElementById('nome-produto-modal').textContent = cartao.dataset.nome;
            document.getElementById('desc-produto-modal').textContent = cartao.dataset.desc;
            document.getElementById('detalhes-produto-modal').textContent = cartao.dataset.detalhes;
            document.querySelector('.modal-produto .entrada-quantidade').value = 1;
            document.getElementById('observacao-produto').value = '';
            atualizarPrecoTotalModal();
            sobreposicaoModal.classList.add('ativo');
        }

        const botaoAdicionar = e.target.closest('.botao-adicionar');
        if (botaoAdicionar) {
            const cartaoProduto = botaoAdicionar.closest('.cartao-produto');
            if (!cartaoProduto) return;
            const produto = {
                nome: cartaoProduto.dataset.nome,
                preco: parseFloat(cartaoProduto.dataset.preco),
                imagem: cartaoProduto.querySelector('img').src,
            };
            adicionarAoCarrinho(produto);
        }
    });

    document.querySelector('.botao-adicionar-carrinho-modal').addEventListener('click', () => {
        const nomeProduto = document.getElementById('nome-produto-modal').textContent;
        const produto = {
            nome: nomeProduto,
            preco: precoProdutoAtualModal,
            imagem: document.getElementById('imagem-produto-modal').src
        };
        const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value);
        const observacao = document.getElementById('observacao-produto').value.trim();
        adicionarAoCarrinho(produto, quantidade, observacao || null);
        sobreposicaoModal.classList.remove('ativo');
    });

    document.getElementById('lista-itens-carrinho').addEventListener('click', (e) => {
        const itemEl = e.target.closest('.item-carrinho-novo');
        if (!itemEl) return;
        const idUnico = itemEl.dataset.idUnico;
        const item = carrinho.find(i => i.idUnico === idUnico);
        if (e.target.closest('.aumentar-item')) {
            atualizarQuantidade(idUnico, item.quantidade + 1);
        } else if (e.target.closest('.diminuir-item')) {
            atualizarQuantidade(idUnico, item.quantidade - 1);
        } else if (e.target.closest('.botao-remover-item')) {
            removerItemDoCarrinho(idUnico);
        }
    });
    
    // Listener para o "Peça também"
    secaoPecaTambem.addEventListener('click', (e) => {
        const botaoAdicionar = e.target.closest('.botao-add-sugestao');
        if (botaoAdicionar) {
            const itemSugestao = botaoAdicionar.closest('.item-sugestao');
            const produto = {
                nome: itemSugestao.dataset.nome,
                preco: parseFloat(itemSugestao.dataset.preco),
                imagem: itemSugestao.querySelector('img').src
            };
            adicionarAoCarrinho(produto);
        }
    });
    
    document.getElementById('botao-carrinho').addEventListener('click', () => togglePainelCarrinho(true));
    document.getElementById('botao-fechar-painel-novo').addEventListener('click', () => togglePainelCarrinho(false));
    document.getElementById('adicionar-mais-itens').addEventListener('click', (e) => {
        e.preventDefault();
        togglePainelCarrinho(false);
    });
    sobreposicaoCarrinho.addEventListener('click', () => togglePainelCarrinho(false));
    document.getElementById('botao-fechar-confirmacao').addEventListener('click', () => modalConfirmacao.classList.remove('visivel'));
    
    btnContinuarCarrinho.addEventListener('click', () => {
        if (carrinho.length === 0) {
            mostrarNotificacao("Seu carrinho está vazio!");
            return;
        }

        if (etapaAtualCarrinho === 'itens') {
            navegarCarrinho('entrega');
        } else if (etapaAtualCarrinho === 'entrega') {
            const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value === 'padrao';
            if (isEntrega && !formEndereco.checkValidity()) {
                formEndereco.reportValidity();
                return;
            }
            navegarCarrinho('pagamento');
        } else if (etapaAtualCarrinho === 'pagamento') {
            console.log("Pedido Finalizado:", { carrinho });
            modalConfirmacao.classList.add('visivel');
            carrinho = [];
            salvarCarrinhoLocalStorage();
            renderizarItensCarrinho();
            togglePainelCarrinho(false);
        }
    });

    btnVoltarCarrinho.addEventListener('click', () => {
        if (etapaAtualCarrinho === 'pagamento') navegarCarrinho('entrega');
        else if (etapaAtualCarrinho === 'entrega') navegarCarrinho('itens');
    });

    radiosTipoEntrega.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isEntrega = e.target.value === 'padrao';
            formEnderecoContainer.classList.toggle('escondido', !isEntrega);
            inputsEndereco.forEach(input => {
                if (input.id !== 'endereco-complemento') {
                    input.required = isEntrega;
                }
            });
            atualizarTodosResumos();
        });
    });

    document.getElementById('add-cpf').addEventListener('change', function() {
        document.querySelector('.input-cpf-container').classList.toggle('visivel', this.checked);
    });

    // =================================================================
    // INICIALIZAÇÃO DO SCRIPT
    // =================================================================
    ajustarPaddingCorpo();
    carregarCarrinhoLocalStorage();
});