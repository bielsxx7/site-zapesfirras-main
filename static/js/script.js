document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica para Ajuste Dinâmico do Header (ESSENCIAL PARA O LAYOUT) ---
    const barraNavegacao = document.querySelector('.barra-navegacao');
    function ajustarPaddingCorpo() {
        if (barraNavegacao) {
            const alturaHeader = barraNavegacao.offsetHeight;
            const pesquisaMobile = document.querySelector('.container-pesquisa-mobile');
            let alturaTotal = alturaHeader;

            // Se a barra de pesquisa mobile estiver visível, adiciona sua altura
            if (window.getComputedStyle(pesquisaMobile).display !== 'none') {
                alturaTotal += pesquisaMobile.offsetHeight;
            }
            
            document.body.style.paddingTop = `${alturaTotal}px`;
        }
    }
    // Ajusta o padding assim que a página carrega
    ajustarPaddingCorpo();
    // Ajusta novamente caso o usuário redimensione a janela
    window.addEventListener('resize', ajustarPaddingCorpo);


    // --- Referências de Elementos ---
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const menuHamburguer = document.querySelector('.menu-hamburguer');
    const menuNavegacao = document.querySelector('.menu-navegacao');
    const carrosselCategorias = document.querySelector('.carrossel-categorias');
    const botaoAnterior = document.querySelector('.botao-anterior');
    const botaoProximo = document.querySelector('.botao-proximo');
    const botoesDetalhes = document.querySelectorAll('.botao-detalhes');
    const botoesAdicionar = document.querySelectorAll('.botao-adicionar');
    const sobreposicaoModal = document.getElementById('modal-sobreposicao');
    const botaoFecharModal = document.getElementById('botao-fechar-modal');
    const imagemProdutoModal = document.getElementById('imagem-produto-modal');
    const nomeProdutoModal = document.getElementById('nome-produto-modal');
    const descProdutoModal = document.getElementById('desc-produto-modal');
    const detalhesProdutoModal = document.getElementById('detalhes-produto-modal');
    const precoProdutoModal = document.getElementById('preco-produto-modal');
    const entradaQuantidade = document.querySelector('.entrada-quantidade');
    const botaoMais = document.querySelector('.botao-mais');
    const botaoMenos = document.querySelector('.botao-menos');
    const botaoAdicionarCarrinhoModal = document.querySelector('.botao-adicionar-carrinho-modal');
    const areaObservacaoProduto = document.getElementById('observacao-produto');
    const botaoCarrinho = document.getElementById('botao-carrinho');
    const painelCarrinho = document.getElementById('painel-carrinho');
    const botaoFecharPainel = document.getElementById('botao-fechar-painel');
    const containerItensCarrinho = document.getElementById('itens-carrinho');
    const subtotalCarrinho = document.getElementById('subtotal-carrinho');
    const totalCarrinho = document.getElementById('total-carrinho');
    const contadorCarrinhoSpan = document.getElementById('contador-carrinho');
    const notificacao = document.getElementById('notificacao');
    const textoNotificacao = document.getElementById('texto-notificacao');

    let precoProdutoAtual = 0;
    let carrinho = [];
    const TAXA_ENTREGA = 5.00;

    // --- Lógica de Carregamento ---
    const duracaoCarregamento = 3000;
    setTimeout(() => {
        if (telaCarregamento) {
            telaCarregamento.style.opacity = '0';
            telaCarregamento.style.visibility = 'hidden';
        }
        if (conteudoPrincipal) {
            conteudoPrincipal.style.display = 'block';
            ajustarPaddingCorpo(); // Reajusta o padding após o conteúdo aparecer
        }
    }, duracaoCarregamento);

    // --- Lógica do Menu Hambúrguer ---
    if (menuHamburguer && menuNavegacao) {
        menuHamburguer.addEventListener('click', () => {
            menuNavegacao.classList.toggle('ativo');
        });
    }

    // --- Lógica do Carrossel ---
    if (carrosselCategorias && botaoAnterior && botaoProximo) {
        const valorRolagem = 250;
        botaoProximo.addEventListener('click', () => {
            carrosselCategorias.scrollBy({ left: valorRolagem, behavior: 'smooth' });
        });
        botaoAnterior.addEventListener('click', () => {
            carrosselCategorias.scrollBy({ left: -valorRolagem, behavior: 'smooth' });
        });
    }

    // --- LÓGICA DE PESQUISA ATUALIZADA PARA AMBAS AS BARRAS ---
    const todasEntradasPesquisa = document.querySelectorAll('.texto-pesquisa');
    const mensagemSemResultados = document.getElementById('sem-resultados');
    const todosCartoesProduto = document.querySelectorAll('.cartao-produto');

    function filtrarProdutos(termoPesquisa) {
        let produtoEncontrado = false;
        
        todosCartoesProduto.forEach(cartao => {
            const nomeProduto = cartao.getAttribute('data-nome').toLowerCase();
            const secaoProduto = cartao.closest('.container-secao');

            if (nomeProduto.includes(termoPesquisa)) {
                cartao.style.display = 'flex';
                produtoEncontrado = true;
            } else {
                cartao.style.display = 'none';
            }
        });

        // Lógica para mostrar/esconder seções inteiras
        document.querySelectorAll('.container-secao').forEach(secao => {
            // Não mexer nas seções de categorias e banners
            if (secao.querySelector('.carrossel-categorias') || secao.querySelector('.carrossel-banners')) return;

            const produtosVisiveis = secao.querySelectorAll('.cartao-produto[style*="display: flex"]');
            if (produtosVisiveis.length > 0) {
                secao.style.display = 'block';
            } else {
                secao.style.display = 'none';
            }
        });
        
        if (mensagemSemResultados) {
             mensagemSemResultados.style.display = produtoEncontrado ? 'none' : 'block';
        }
    }

    todasEntradasPesquisa.forEach(input => {
        input.addEventListener('input', () => {
            const termo = input.value.toLowerCase().trim();
            
            // Sincroniza o valor entre as duas barras de pesquisa
            todasEntradasPesquisa.forEach(outroInput => {
                if (outroInput !== input) {
                    outroInput.value = input.value;
                }
            });

            filtrarProdutos(termo);
        });
    });


    // --- Lógica para ABRIR e FECHAR o Modal ---
    botoesDetalhes.forEach(btn => {
        btn.addEventListener('click', (event) => {
            const cartao = event.target.closest('.cartao-produto');
            if (!cartao) return;

            const nome = cartao.getAttribute('data-nome');
            const desc = cartao.querySelector('h4').textContent;
            const detalhes = cartao.querySelector('p').textContent;
            const preco = parseFloat(cartao.getAttribute('data-preco'));
            const imagem = cartao.querySelector('.container-detalhes-produto img').src;

            imagemProdutoModal.src = imagem;
            nomeProdutoModal.textContent = nome;
            descProdutoModal.textContent = desc;
            detalhesProdutoModal.textContent = detalhes;
            precoProdutoModal.textContent = `R$ ${preco.toFixed(2).replace('.', ',')}`;
            entradaQuantidade.value = 1;
            precoProdutoAtual = preco;
            atualizarPrecoTotal();
            if (areaObservacaoProduto) areaObservacaoProduto.value = '';

            sobreposicaoModal.classList.add('ativo');
        });
    });

    if (botaoFecharModal) {
        botaoFecharModal.addEventListener('click', () => {
            sobreposicaoModal.classList.remove('ativo');
        });
    }
    
    // --- Lógica para o botão de Adicionar Rápido ---
    botoesAdicionar.forEach(btn => {
        btn.addEventListener('click', () => {
            const cartao = btn.closest('.cartao-produto');
            if (!cartao) return;

            const nome = cartao.getAttribute('data-nome');
            const preco = parseFloat(cartao.getAttribute('data-preco'));
            const imagem = cartao.querySelector('.container-detalhes-produto img').src;

            adicionarAoCarrinho(nome, 1, preco, null, imagem);
            mostrarNotificacao(`1 "${nome}" adicionado!`);
        });
    });
    
    // --- Lógica do Seletor de Quantidade ---
    function atualizarPrecoTotal() {
        const quantidade = parseInt(entradaQuantidade.value);
        const precoTotal = precoProdutoAtual * quantidade;
        botaoAdicionarCarrinhoModal.textContent = `Adicionar R$ ${precoTotal.toFixed(2).replace('.', ',')}`;
    }

    if (botaoMais && botaoMenos) {
        botaoMais.addEventListener('click', () => {
            entradaQuantidade.value = parseInt(entradaQuantidade.value) + 1;
            atualizarPrecoTotal();
        });

        botaoMenos.addEventListener('click', () => {
            let quantidade = parseInt(entradaQuantidade.value);
            if (quantidade > 1) {
                entradaQuantidade.value = quantidade - 1;
                atualizarPrecoTotal();
            }
        });
    }

    if (botaoAdicionarCarrinhoModal) {
        botaoAdicionarCarrinhoModal.addEventListener('click', () => {
            const quantidade = parseInt(entradaQuantidade.value);
            const nomeProduto = nomeProdutoModal.textContent;
            const observacaoProduto = areaObservacaoProduto.value;
            const imagemProduto = imagemProdutoModal.src;
            adicionarAoCarrinho(nomeProduto, quantidade, precoProdutoAtual, observacaoProduto, imagemProduto);
            sobreposicaoModal.classList.remove('ativo');
            mostrarNotificacao(`${quantidade} "${nomeProduto}" adicionado!`);
        });
    }

    // --- Lógica do Painel do Carrinho ---
    function adicionarAoCarrinho(nome, quantidade, preco, observacao, imagem) {
        const itemExistente = carrinho.find(item => item.nome === nome && item.observacao === observacao);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ nome, quantidade, preco, observacao, imagem });
        }
        renderizarCarrinho();
    }
    
    function renderizarCarrinho() {
        if (!containerItensCarrinho) return;

        if (carrinho.length === 0) {
            containerItensCarrinho.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>';
            subtotalCarrinho.textContent = 'R$ 0,00';
            totalCarrinho.textContent = `R$ ${TAXA_ENTREGA.toFixed(2).replace('.', ',')}`;
            contadorCarrinhoSpan.textContent = '0';
            contadorCarrinhoSpan.classList.remove('ativo');
            return;
        }

        containerItensCarrinho.innerHTML = '';
        let subtotal = 0;
        let totalItens = 0;

        carrinho.forEach((item, index) => {
            const observacaoHTML = item.observacao ? `<p class="observacao-item">Obs: ${item.observacao}</p>` : '';
            const itemHTML = `
                <div class="cartao-item" data-indice="${index}">
                    <img src="${item.imagem}" alt="${item.nome}" class="imagem-item">
                    <div class="info-item">
                        <span class="nome-item">${item.nome}</span>
                        ${observacaoHTML}
                        <div class="seletor-quantidade">
                            <button class="botao-quantidade botao-menos">-</button>
                            <span class="quantidade-item">${item.quantidade}</span>
                            <button class="botao-quantidade botao-mais">+</button>
                        </div>
                    </div>
                    <div class="preco-item">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</div>
                    <button class="botao-remover">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            `;
            containerItensCarrinho.innerHTML += itemHTML;
            subtotal += item.preco * item.quantidade;
            totalItens += item.quantidade;
        });
        
        const total = subtotal + TAXA_ENTREGA;

        subtotalCarrinho.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        totalCarrinho.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        contadorCarrinhoSpan.textContent = totalItens;
        contadorCarrinhoSpan.classList.toggle('ativo', totalItens > 0);
        
        // Adiciona eventos aos novos botões do carrinho
        adicionarEventosCarrinho();
    }

    function adicionarEventosCarrinho() {
        document.querySelectorAll('.cartao-item').forEach(cartaoItem => {
            const index = parseInt(cartaoItem.dataset.indice);

            cartaoItem.querySelector('.botao-remover').addEventListener('click', () => {
                carrinho.splice(index, 1);
                renderizarCarrinho();
            });

            cartaoItem.querySelector('.botao-mais').addEventListener('click', () => {
                carrinho[index].quantidade++;
                renderizarCarrinho();
            });

            cartaoItem.querySelector('.botao-menos').addEventListener('click', () => {
                if (carrinho[index].quantidade > 1) {
                    carrinho[index].quantidade--;
                } else {
                    carrinho.splice(index, 1);
                }
                renderizarCarrinho();
            });
        });
    }
    
    // --- Notificação Temporária ---
    let timeoutNotificacao;
    function mostrarNotificacao(mensagem) {
        if (!notificacao || !textoNotificacao) return;
        clearTimeout(timeoutNotificacao);
        
        textoNotificacao.textContent = mensagem;
        notificacao.classList.add('mostrar');

        timeoutNotificacao = setTimeout(() => {
            notificacao.classList.remove('mostrar');
        }, 2000);
    }
    
 
// --- Funções do Painel do Carrinho ---
    function abrirPainelCarrinho() {
        painelCarrinho.classList.add('ativo');
    }

    function fecharPainelCarrinho() {
        painelCarrinho.classList.remove('ativo');
    }
    
    // Liga os botões ao painel do carrinho
    if (botaoCarrinho && painelCarrinho && botaoFecharPainel) {
        botaoCarrinho.addEventListener('click', abrirPainelCarrinho);
        botaoFecharPainel.addEventListener('click', fecharPainelCarrinho);
    }
});


// Aguarda o carregamento completo do conteúdo da página antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- CÓDIGO PARA ROLAGEM SUAVE DAS CATEGORIAS ---

    // 1. Seleciona todos os links de categoria no carrossel
    const linksCategorias = document.querySelectorAll('.carrossel-categorias .item-carrossel');

    // 2. Adiciona um "escutador de cliques" para cada link de categoria
    linksCategorias.forEach(link => {
        link.addEventListener('click', function(event) {
            // a. Previne o comportamento padrão do link (que seria navegar para "#")
            event.preventDefault();

            // b. Pega o nome da categoria do texto dentro do link clicado
            // O .trim() remove espaços em branco extras no início e no fim
            const nomeCategoria = this.querySelector('span').textContent.trim();

            // c. Encontra o título <h2> que corresponde à categoria clicada
            // Primeiro, selecionamos todos os títulos h2 dentro das seções
            const todosOsTitulos = document.querySelectorAll('.container-secao h2');
            
            let secaoAlvo = null; // Variável para guardar a seção que queremos encontrar

            // Iteramos por todos os títulos para encontrar o que bate com o nome da categoria
            todosOsTitulos.forEach(titulo => {
                if (titulo.textContent.trim().toLowerCase() === nomeCategoria.toLowerCase()) {
                    // d. Se encontrarmos o título, pegamos a <section> "pai" dele
                    secaoAlvo = titulo.closest('.container-secao');
                }
            });

            // e. Se uma seção correspondente foi encontrada, rola a página até ela
            if (secaoAlvo) {
                secaoAlvo.scrollIntoView({
                    behavior: 'smooth', // Define a animação como "suave"
                    block: 'start'      // Alinha o topo da seção com o topo da tela
                });
            }
        });
    });

});


document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // ESTADO DA APLICAÇÃO E CONSTANTES
    // =================================================================
    let carrinho = [];
    const TAXA_ENTREGA = 5.00;
    let precoProdutoAtualModal = 0;
    let timeoutNotificacao;

    // =================================================================
    // SELETORES DE ELEMENTOS (REFERÊNCIAS GERAIS)
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
    const formPedido = document.getElementById('form-finalizar-pedido');

    // =================================================================
    // INICIALIZAÇÃO E LÓGICAS DE LAYOUT
    // =================================================================

    // Ajusta o padding do corpo para compensar o header fixo
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

    // Lógica da tela de carregamento
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
    // LÓGICAS DE INTERAÇÃO (PESQUISA, CARROSSÉIS, ETC.)
    // =================================================================

    // Lógica unificada para todos os carrosséis
    document.querySelectorAll('.container-secao').forEach(secao => {
        const carrossel = secao.querySelector('.carrossel');
        const btnAnterior = secao.querySelector('.botao-anterior');
        const btnProximo = secao.querySelector('.botao-proximo');
        if (carrossel && btnAnterior && btnProximo) {
            const valorRolagem = 300;
            btnProximo.addEventListener('click', () => carrossel.scrollBy({ left: valorRolagem, behavior: 'smooth' }));
            btnAnterior.addEventListener('click', () => carrossel.scrollBy({ left: -valorRolagem, behavior: 'smooth' }));
        }
    });
    
    // Rolagem suave para seções de categoria
    document.querySelectorAll('.carrossel-categorias .item-carrossel').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const nomeCategoria = this.querySelector('span').textContent.trim().toLowerCase();
            const secaoAlvo = [...document.querySelectorAll('.container-secao h2')].find(h2 => h2.textContent.trim().toLowerCase() === nomeCategoria);
            if (secaoAlvo) secaoAlvo.closest('.container-secao').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Lógica de Pesquisa
    const todasEntradasPesquisa = document.querySelectorAll('.texto-pesquisa');
    const mensagemSemResultados = document.getElementById('sem-resultados');
    const todosCartoesProduto = document.querySelectorAll('.cartao-produto');
    todasEntradasPesquisa.forEach(input => {
        input.addEventListener('input', () => {
            const termo = input.value.toLowerCase().trim();
            todasEntradasPesquisa.forEach(outroInput => { if (outroInput !== input) outroInput.value = input.value; });
            filtrarProdutos(termo);
        });
    });
    
    function filtrarProdutos(termo) {
        let produtoEncontrado = false;
        todosCartoesProduto.forEach(cartao => {
            const deveMostrar = cartao.dataset.nome.toLowerCase().includes(termo);
            cartao.style.display = deveMostrar ? 'flex' : 'none';
            if (deveMostrar) produtoEncontrado = true;
        });
        document.querySelectorAll('.container-secao:not(:has(.carrossel))').forEach(secao => {
            const produtosVisiveis = secao.querySelectorAll('.cartao-produto[style*="display: flex"]').length;
            secao.style.display = produtosVisiveis > 0 ? 'block' : 'none';
        });
        if (mensagemSemResultados) mensagemSemResultados.style.display = produtoEncontrado || termo === '' ? 'none' : 'block';
    }

    // =================================================================
    // LÓGICA DO MODAL DE PRODUTOS
    // =================================================================
    function atualizarPrecoTotalModal() {
        const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value);
        const precoTotal = precoProdutoAtualModal * quantidade;
        document.querySelector('.botao-adicionar-carrinho-modal').textContent = `Adicionar R$ ${precoTotal.toFixed(2).replace('.', ',')}`;
    }

    // Event Delegation para abrir o modal de detalhes
    document.querySelector('.container-principal').addEventListener('click', (e) => {
        const botaoDetalhes = e.target.closest('.botao-detalhes');
        if (botaoDetalhes) {
            const cartao = botaoDetalhes.closest('.cartao-produto');
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
    });
    
    // Controles e botões do modal
    document.getElementById('botao-fechar-modal').addEventListener('click', () => sobreposicaoModal.classList.remove('ativo'));
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

    // =================================================================
    // LÓGICA DO CARRINHO (VERSÃO AVANÇADA)
    // =================================================================
    const adicionarAoCarrinho = (produto, quantidade = 1, observacao = null) => {
        const idUnicoItem = produto.id + (observacao || '').trim().toLowerCase();
        const itemExistente = carrinho.find(item => item.idUnico === idUnicoItem);

        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ ...produto, quantidade, observacao, idUnico: idUnicoItem });
        }
        salvarCarrinhoLocalStorage();
        renderizarCarrinho();
        mostrarNotificacao(`${quantidade} "${produto.nome}" adicionado(s)!`);
    };

    const atualizarQuantidade = (idUnico, novaQuantidade) => {
        const itemIndex = carrinho.findIndex(item => item.idUnico === idUnico);
        if (itemIndex === -1) return;

        if (novaQuantidade > 0) {
            carrinho[itemIndex].quantidade = novaQuantidade;
            salvarCarrinhoLocalStorage();
            renderizarCarrinho();
        } else {
            removerDoCarrinho(idUnico);
        }
    };

    const removerDoCarrinho = (idUnico) => {
        const itemEl = document.querySelector(`.cartao-item-carrinho[data-id-unico="${idUnico}"]`);
        if (itemEl) {
            itemEl.classList.add('removendo');
            setTimeout(() => {
                carrinho = carrinho.filter(item => item.idUnico !== idUnico);
                salvarCarrinhoLocalStorage();
                renderizarCarrinho();
            }, 400);
        }
    };

    const renderizarCarrinho = () => {
        const containerItensCarrinho = document.getElementById('itens-carrinho');
        if (carrinho.length === 0) {
            containerItensCarrinho.innerHTML = '<p class="mensagem-carrinho-vazio">Seu carrinho está vazio.</p>';
        } else {
            containerItensCarrinho.innerHTML = carrinho.map(item => `
                <div class="cartao-item-carrinho" data-id-unico="${item.idUnico}">
                    <img src="${item.imagem}" alt="${item.nome}" class="imagem-item-carrinho">
                    <div class="info-item-carrinho">
                        <p class="nome-item-carrinho">${item.nome}</p>
                        ${item.observacao ? `<p class="observacao-item-carrinho">Obs: ${item.observacao}</p>` : ''}
                        <div class="seletor-quantidade-carrinho">
                            <button class="botao-quantidade-carrinho diminuir" data-id-unico="${item.idUnico}">-</button>
                            <span class="valor-quantidade-carrinho">${item.quantidade}</span>
                            <button class="botao-quantidade-carrinho aumentar" data-id-unico="${item.idUnico}">+</button>
                        </div>
                    </div>
                    <div class="subtotal-item-carrinho">
                        <p>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</p>
                        <button class="botao-remover-item" data-id-unico="${item.idUnico}"><ion-icon name="trash-outline"></ion-icon></button>
                    </div>
                </div>
            `).join('');
        }
        atualizarTotaisEContador();
    };

    const atualizarTotaisEContador = () => {
        const tipoPedido = document.querySelector('input[name="tipo-pedido"]:checked')?.value || 'retirada';
        const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const taxa = tipoPedido === 'entrega' ? TAXA_ENTREGA : 0;
        const total = subtotal + taxa;
        
        document.getElementById('linha-taxa-entrega').style.display = tipoPedido === 'entrega' ? 'flex' : 'none';
        document.getElementById('subtotal-carrinho').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        document.getElementById('taxa-entrega-carrinho').textContent = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
        document.getElementById('total-carrinho').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        
        const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        contadorCarrinhoEl.textContent = totalItens;
        contadorCarrinhoEl.classList.toggle('ativo', totalItens > 0);
    };

    const togglePainelCarrinho = (abrir = null) => {
        const ativo = abrir === null ? !painelCarrinho.classList.contains('ativo') : abrir;
        painelCarrinho.classList.toggle('ativo', ativo);
        sobreposicaoCarrinho.classList.toggle('ativo', ativo);
    };

    const salvarCarrinhoLocalStorage = () => localStorage.setItem('carrinhoZapEsfirras', JSON.stringify(carrinho));
    const carregarCarrinhoLocalStorage = () => {
        const carrinhoSalvo = localStorage.getItem('carrinhoZapEsfirras');
        carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
        renderizarCarrinho();
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

    // Adicionar item via "Adicionar Rápido"
    document.querySelector('.container-principal').addEventListener('click', (e) => {
        const botaoAdicionar = e.target.closest('.botao-adicionar');
        if (botaoAdicionar) {
            const cartaoProduto = botaoAdicionar.closest('.cartao-produto');
            const produto = {
                id: cartaoProduto.dataset.id,
                nome: cartaoProduto.dataset.nome,
                preco: parseFloat(cartaoProduto.dataset.preco),
                imagem: cartaoProduto.querySelector('img').src,
            };
            adicionarAoCarrinho(produto);
        }
    });

    // Adicionar item via Modal
    document.querySelector('.botao-adicionar-carrinho-modal').addEventListener('click', () => {
        const nomeProduto = document.getElementById('nome-produto-modal').textContent;
        const cartaoProduto = document.querySelector(`[data-nome="${nomeProduto}"]`);
        const produto = {
            id: cartaoProduto.dataset.id,
            nome: nomeProduto,
            preco: precoProdutoAtualModal,
            imagem: document.getElementById('imagem-produto-modal').src
        };
        const quantidade = parseInt(document.querySelector('.modal-produto .entrada-quantidade').value);
        const observacao = document.getElementById('observacao-produto').value.trim();
        adicionarAoCarrinho(produto, quantidade, observacao || null);
        sobreposicaoModal.classList.remove('ativo');
    });

    // Ações dentro do carrinho (event delegation)
    document.getElementById('itens-carrinho').addEventListener('click', (e) => {
        const target = e.target;
        const idUnico = target.dataset.idUnico || target.closest('button')?.dataset.idUnico;
        if (!idUnico) return;

        const item = carrinho.find(i => i.idUnico === idUnico);
        if (target.matches('.aumentar')) {
            atualizarQuantidade(idUnico, item.quantidade + 1);
        } else if (target.matches('.diminuir')) {
            atualizarQuantidade(idUnico, item.quantidade - 1);
        } else if (target.closest('.botao-remover-item')) {
            removerDoCarrinho(idUnico);
        }
    });
    
    // Controles do painel do carrinho e modal de confirmação
    document.getElementById('botao-carrinho').addEventListener('click', () => togglePainelCarrinho(true));
    document.getElementById('botao-fechar-painel').addEventListener('click', () => togglePainelCarrinho(false));
    sobreposicaoCarrinho.addEventListener('click', () => togglePainelCarrinho(false));
    document.getElementById('botao-fechar-confirmacao').addEventListener('click', () => modalConfirmacao.classList.remove('visivel'));
    
    // Lógica do formulário de finalização
    formPedido.addEventListener('change', (e) => {
        const { name, value } = e.target;
        const camposEndereco = document.getElementById('campos-endereco-container');
        const campoTroco = document.getElementById('campo-troco-container');
        const campoValorTroco = document.getElementById('campo-valor-troco');

        if (name === 'tipo-pedido') {
            const ehEntrega = value === 'entrega';
            camposEndereco.classList.toggle('visivel', ehEntrega);
            document.querySelectorAll('#campos-endereco-container input').forEach(input => input.required = ehEntrega);
            atualizarTotaisEContador();
        }
        if (name === 'forma-pagamento') {
            const ehDinheiro = value === 'dinheiro';
            campoTroco.classList.toggle('visivel', ehDinheiro);
            document.querySelectorAll('#campo-troco-container input[type="radio"]').forEach(input => input.required = ehDinheiro);
             if(!ehDinheiro) campoValorTroco.classList.remove('visivel'); // Esconde valor do troco se mudar de dinheiro
        }
        if (name === 'precisa-troco') {
            const precisaDeTroco = value === 'sim';
            campoValorTroco.classList.toggle('visivel', precisaDeTroco);
            document.getElementById('valor-troco').required = precisaDeTroco;
        }
    });

    formPedido.addEventListener('submit', (e) => {
        e.preventDefault();
        if (carrinho.length === 0) {
            mostrarNotificacao('Seu carrinho está vazio.'); return;
        }
        
        const dadosPedido = {
            cliente: document.getElementById('nome-cliente').value,
            telefone: document.getElementById('telefone-cliente').value,
            tipoPedido: formPedido['tipo-pedido'].value,
            endereco: formPedido['tipo-pedido'].value === 'entrega' ? {
                rua: document.getElementById('endereco-cliente').value,
                bairro: document.getElementById('bairro-cliente').value,
                numero: document.getElementById('numero-cliente').value,
                complemento: document.getElementById('complemento-cliente').value
            } : null,
            pagamento: {
                forma: formPedido['forma-pagamento'].value,
                trocoPara: formPedido['forma-pagamento'].value === 'dinheiro' && formPedido['precisa-troco'].value === 'sim' 
                    ? document.getElementById('valor-troco').value 
                    : null
            },
            itens: carrinho,
            total: document.getElementById('total-carrinho').textContent
        };

        console.log("DADOS DO PEDIDO PARA ENVIAR:", dadosPedido);
        modalConfirmacao.classList.add('visivel');
        
        carrinho = [];
        salvarCarrinhoLocalStorage();
        renderizarCarrinho();
        formPedido.reset();
        document.querySelectorAll('.container-campos-dinamicos.visivel').forEach(el => el.classList.remove('visivel'));
        togglePainelCarrinho(false);
    });
    
    // =================================================================
    // INICIALIZAÇÃO DO SCRIPT
    // =================================================================
    ajustarPaddingCorpo();
    carregarCarrinhoLocalStorage();
    formPedido.dispatchEvent(new Event('change', { bubbles: true }));
});

/* ======================================================= */
/* --- CORREÇÃO: Funcionalidade do Menu Hambúrguer --- */
/* ======================================================= */

const menuHamburguer = document.querySelector('.menu-hamburguer');
const menuNavegacao = document.querySelector('.menu-navegacao');

if (menuHamburguer && menuNavegacao) {
    menuHamburguer.addEventListener('click', () => {
        // Esta linha adiciona ou remove a classe 'ativo' do menu de navegação
        menuNavegacao.classList.toggle('ativo');
    });
}