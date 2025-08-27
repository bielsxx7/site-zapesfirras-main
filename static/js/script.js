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