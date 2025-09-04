document.addEventListener('DOMContentLoaded', () => {
    const telaCarregamento = document.getElementById('tela-carregamento');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const containerListaPedidos = document.getElementById('lista-pedidos');
    const contadorCarrinhoMobileEl = document.getElementById('contador-carrinho-mobile');
    const btnCarrinhoMobile = document.getElementById('botao-carrinho-mobile');

    const statusInfo = {
        'Novo': { texto: "Pedido Recebido", icone: "receipt-outline", progresso: 0 },
        'Em Preparo': { texto: "Em Preparo", icone: "restaurant-outline", progresso: 33 },
        'Prontos': { texto: "Pronto para Retirada", icone: "bag-handle-outline", progresso: 66 },
        'Em Entrega': { texto: "Saiu para Entrega", icone: "bicycle-outline", progresso: 66 },
        'Finalizado': { texto: "Pedido Finalizado", icone: "checkmark-done-circle-outline", progresso: 100 }
    };
    
    // --- CONEXÃO COM SOCKET.IO ---
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
        console.log('Conectado ao servidor de pedidos!');
    });

    // --- OUVINTE PARA ATUALIZAÇÕES DE STATUS ---
    socket.on('order_status_updated', ({ orderId, newStatus }) => {
        console.log(`Atualização recebida: Pedido #${orderId} está agora "${newStatus}"`);
        
        const pedidoEl = document.getElementById(`pedido-${orderId}`);
        if (pedidoEl) {
            const tipoEntrega = pedidoEl.dataset.tipoEntrega;
            atualizarUIStatus(pedidoEl, newStatus, tipoEntrega);
            
            // Atualiza o pedido no localStorage também
            let pedidos = JSON.parse(localStorage.getItem('pedidosZapEsfirras')) || [];
            const pedidoIndex = pedidos.findIndex(p => p.id == orderId);
            if(pedidoIndex > -1){
                pedidos[pedidoIndex].status = newStatus;
                localStorage.setItem('pedidosZapEsfirras', JSON.stringify(pedidos));
            }
        }
    });

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
            pedidos.sort((a, b) => new Date(b.data) - new Date(a.data));
            containerListaPedidos.innerHTML = pedidos.map(criarCartaoPedidoHTML).join('');
            
            // Atualiza a UI de todos os cards para o estado mais recente
            pedidos.forEach(pedido => {
                const cartaoPedido = document.getElementById(`pedido-${pedido.id}`);
                if (cartaoPedido) {
                    atualizarUIStatus(cartaoPedido, pedido.status, pedido.tipoEntrega);
                }
            });
        }
    }

    function criarCartaoPedidoHTML(pedido) {
        const dataPedido = new Date(pedido.data);
        const dataFormatada = dataPedido.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const horaFormatada = dataPedido.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const etapaEntrega = pedido.tipoEntrega === 'padrao' ? 'Em Entrega' : 'Prontos';
        const etapaFinal = pedido.tipoEntrega === 'padrao' ? 'Finalizado' : 'Finalizado'; // Simplificado, ambos finalizam

        return `
            <div class="cartao-pedido" id="pedido-${pedido.id}" data-tipo-entrega="${pedido.tipoEntrega}">
                <div class="cabecalho-cartao-pedido">
                    <h3>Pedido #${String(pedido.id).slice(-4)}</h3>
                    <span>${dataFormatada} às ${horaFormatada}</span>
                </div>
                <div class="corpo-cartao-pedido">
                    <div class="status-atual">
                        <ion-icon name="receipt-outline"></ion-icon>
                        <div class="texto-status">
                            <h4>Pedido Recebido</h4>
                            <p>Previsão: ${new Date(dataPedido.getTime() + 45 * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                    <div class="linha-tempo-status">
                        <div class="barra-progresso-status" style="width: 0%;"></div>
                        <div class="etapa-status" data-etapa="Novo">
                            <div class="icone-etapa"><ion-icon name="receipt-outline"></ion-icon></div>
                            <p>Recebido</p>
                        </div>
                        <div class="etapa-status" data-etapa="Em Preparo">
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

    function atualizarUIStatus(cartao, status, tipoEntrega) {
        const statusAtualEl = cartao.querySelector('.status-atual');
        const barraProgresso = cartao.querySelector('.barra-progresso-status');
        const etapas = cartao.querySelectorAll('.etapa-status');

        const info = statusInfo[status];
        if (!info) return;

        statusAtualEl.querySelector('ion-icon').name = info.icone;
        statusAtualEl.querySelector('h4').textContent = info.texto;
        barraProgresso.style.width = `${info.progresso}%`;

        const sequenciaStatus = ['Novo', 'Em Preparo', tipoEntrega === 'padrao' ? 'Em Entrega' : 'Prontos', 'Finalizado'];
        const statusAtualIndex = sequenciaStatus.indexOf(status);

        etapas.forEach((etapa, index) => {
            if (index <= statusAtualIndex) {
                etapa.classList.add('ativa');
            } else {
                etapa.classList.remove('ativa');
            }
        });
    }

    function atualizarContadorCarrinho() {
        const carrinho = JSON.parse(localStorage.getItem('carrinhoZapEsfirras')) || [];
        const totalItens = carrinho.reduce((acc, item) => acc + item.quantity, 0);
        if (contadorCarrinhoMobileEl) {
            contadorCarrinhoMobileEl.textContent = totalItens;
            contadorCarrinhoMobileEl.classList.toggle('ativo', totalItens > 0);
        }
        if (btnCarrinhoMobile) {
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