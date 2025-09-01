document.addEventListener('DOMContentLoaded', () => {
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const containerListaPedidos = document.getElementById('lista-pedidos');
    const contadorCarrinhoMobileEl = document.getElementById('contador-carrinho-mobile');
    const btnCarrinhoMobile = document.getElementById('botao-carrinho-mobile');

    const statusInfo = {
        recebido: { texto: "Pedido Recebido", icone: "receipt-outline", progresso: 0 },
        preparando: { texto: "Em Preparo", icone: "restaurant-outline", progresso: 33 },
        'a-caminho': { texto: "Saiu para Entrega", icone: "bicycle-outline", progresso: 66 },
        entregue: { texto: "Pedido Entregue", icone: "checkmark-done-circle-outline", progresso: 100 },
        'pronto-retirada': { texto: "Pronto para Retirada", icone: "bag-handle-outline", progresso: 66 },
        finalizado: { texto: "Pedido Finalizado", icone: "checkmark-done-circle-outline", progresso: 100 }
    };

    function carregarPedidos() {
        const pedidos = JSON.parse(localStorage.getItem('pedidosZapEsfirras')) || [];
        if (pedidos.length === 0) {
            containerListaPedidos.innerHTML = `
                <div id="sem-pedidos">
                    <ion-icon name="document-text-outline"></ion-icon>
                    <h3>Nenhum pedido por aqui</h3>
                    <p>Que tal fazer seu primeiro pedido?</p>
                </div>
            `;
        } else {
            // Ordena para mostrar os mais recentes primeiro
            pedidos.sort((a, b) => new Date(b.data) - new Date(a.data));
            containerListaPedidos.innerHTML = pedidos.map(criarCartaoPedidoHTML).join('');
            pedidos.forEach(iniciarSimulacaoStatus);
        }
    }

    function criarCartaoPedidoHTML(pedido) {
        const dataPedido = new Date(pedido.data);
        const dataFormatada = dataPedido.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const horaFormatada = dataPedido.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const etapaEntrega = pedido.tipoEntrega === 'padrao' ? 'a-caminho' : 'pronto-retirada';
        const etapaFinal = pedido.tipoEntrega === 'padrao' ? 'entregue' : 'finalizado';

        return `
            <div class="cartao-pedido" id="pedido-${pedido.id}">
                <div class="cabecalho-cartao-pedido">
                    <h3>Pedido #${String(pedido.id).slice(-4)}</h3>
                    <span>${dataFormatada} às ${horaFormatada}</span>
                </div>
                <div class="corpo-cartao-pedido">
                    <div class="status-atual">
                        <ion-icon name="${statusInfo[pedido.status].icone}"></ion-icon>
                        <div class="texto-status">
                            <h4>${statusInfo[pedido.status].texto}</h4>
                            <p>Previsão: ${new Date(dataPedido.getTime() + 45 * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                    <div class="linha-tempo-status">
                        <div class="barra-progresso-status"></div>
                        <div class="etapa-status" data-etapa="recebido">
                            <div class="icone-etapa"><ion-icon name="receipt-outline"></ion-icon></div>
                            <p>Recebido</p>
                        </div>
                        <div class="etapa-status" data-etapa="preparando">
                            <div class="icone-etapa"><ion-icon name="restaurant-outline"></ion-icon></div>
                            <p>Preparando</p>
                        </div>
                        <div class="etapa-status" data-etapa="${etapaEntrega}">
                            <div class="icone-etapa"><ion-icon name="${pedido.tipoEntrega === 'padrao' ? 'bicycle-outline' : 'bag-handle-outline'}"></ion-icon></div>
                            <p>${pedido.tipoEntrega === 'padrao' ? 'A caminho' : 'Retirada'}</p>
                        </div>
                        <div class="etapa-status" data-etapa="${etapaFinal}">
                            <div class="icone-etapa"><ion-icon name="checkmark-done-circle-outline"></ion-icon></div>
                            <p>${pedido.tipoEntrega === 'padrao' ? 'Entregue' : 'Finalizado'}</p>
                        </div>
                    </div>
                </div>
                <div class="rodape-cartao-pedido">
                    <a href="#" class="ver-detalhes">Ver detalhes</a>
                    <button>Ajuda</button>
                </div>
            </div>
        `;
    }

    function iniciarSimulacaoStatus(pedido) {
        const cartaoPedido = document.getElementById(`pedido-${pedido.id}`);
        if (!cartaoPedido) return;

        const etapaEntrega = pedido.tipoEntrega === 'padrao' ? 'a-caminho' : 'pronto-retirada';
        const etapaFinal = pedido.tipoEntrega === 'padrao' ? 'entregue' : 'finalizado';
        
        const sequenciaStatus = ['recebido', 'preparando', etapaEntrega, etapaFinal];
        let statusAtualIndex = sequenciaStatus.indexOf(pedido.status);

        if (statusAtualIndex >= sequenciaStatus.length - 1) {
            atualizarUIStatus(cartaoPedido, pedido.status, pedido.tipoEntrega);
            return;
        }

        function proximoStatus() {
            statusAtualIndex++;
            if (statusAtualIndex < sequenciaStatus.length) {
                pedido.status = sequenciaStatus[statusAtualIndex];
                atualizarUIStatus(cartaoPedido, pedido.status, pedido.tipoEntrega);
                setTimeout(proximoStatus, 15000); // Avança a cada 15 segundos
            }
        }
        
        atualizarUIStatus(cartaoPedido, pedido.status, pedido.tipoEntrega);
        setTimeout(proximoStatus, 15000); // Inicia a simulação
    }

    function atualizarUIStatus(cartao, status, tipoEntrega) {
        const statusAtualEl = cartao.querySelector('.status-atual');
        const barraProgresso = cartao.querySelector('.barra-progresso-status');
        const etapas = cartao.querySelectorAll('.etapa-status');

        const etapaEntrega = tipoEntrega === 'padrao' ? 'a-caminho' : 'pronto-retirada';
        const etapaFinal = tipoEntrega === 'padrao' ? 'entregue' : 'finalizado';
        const sequenciaStatus = ['recebido', 'preparando', etapaEntrega, etapaFinal];
        
        statusAtualEl.querySelector('ion-icon').name = statusInfo[status].icone;
        statusAtualEl.querySelector('h4').textContent = statusInfo[status].texto;
        barraProgresso.style.width = `${statusInfo[status].progresso}%`;

        let statusEncontrado = false;
        etapas.forEach(etapa => {
            const nomeEtapa = etapa.dataset.etapa;
            if (statusEncontrado) {
                etapa.classList.remove('ativa');
            } else {
                etapa.classList.add('ativa');
            }
            if (nomeEtapa === status) {
                statusEncontrado = true;
            }
        });
    }

    // Função para atualizar o contador do carrinho (que deve estar vazio nesta página)
    function atualizarContadorCarrinho() {
        const carrinho = JSON.parse(localStorage.getItem('carrinhoZapEsfirras')) || [];
        const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        if (contadorCarrinhoMobileEl) {
            contadorCarrinhoMobileEl.textContent = totalItens;
            contadorCarrinhoMobileEl.classList.toggle('ativo', totalItens > 0);
            // Redireciona para o início se clicar na sacola, já que aqui não há painel
            btnCarrinhoMobile.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    }


    // --- INICIALIZAÇÃO ---
    setTimeout(() => {
        if (telaCarregamento) {
            telaCarregamento.style.opacity = '0';
            telaCarregamento.addEventListener('transitionend', () => telaCarregamento.style.display = 'none');
        }
        if (conteudoPrincipal) {
            conteudoPrincipal.style.display = 'block';
            carregarPedidos();
            atualizarContadorCarrinho();
        }
    }, 500);
});