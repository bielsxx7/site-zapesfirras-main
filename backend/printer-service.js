const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
const socketIOClient = require('socket.io-client');
const path = require('path');

// --- CONFIGURAÇÕES ---
const SERVER_URL = "http://localhost:3000";
const PRINTER_NAME = 'XP-80C'; // <--- IMPORTANTE: Altere para o nome da sua impressora
const LOGO_PATH = path.join(__dirname, '../frontend/assets/zapesfiiras.png');
// --- FIM DAS CONFIGURAÇÕES ---


// Função principal para se conectar ao servidor e aguardar por pedidos.
function initializePrinterService() {
    console.log("Iniciando serviço de impressão...");
    console.log(`Conectando ao servidor em ${SERVER_URL}...`);

    const socket = socketIOClient(SERVER_URL);

    socket.on('connect', () => {
        console.log(`Conectado ao servidor com sucesso! (ID: ${socket.id})`);
        console.log("Aguardando novos pedidos para impressão...");
    });

    socket.on('disconnect', () => {
        console.warn("Desconectado do servidor. Tentando reconectar...");
    });

    socket.on('print_new_order', async (order) => {
        console.log(`\n-------------------------------------------------`);
        console.log(`>>> Pedido #${order.id} recebido! Imprimindo 2 vias...`);
        try {
            console.log("Imprimindo VIA - COZINHA...");
            await printReceipt(order, "VIA - COZINHA");
            
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log("Imprimindo VIA - CLIENTE...");
            await printReceipt(order, "VIA - CLIENTE");

            console.log(`>>> 2 vias do Pedido #${order.id} impressas com sucesso!`);
            console.log(`-------------------------------------------------\n`);
        } catch (error) {
            console.error(`### ERRO AO IMPRIMIR PEDIDO #${order.id}: ###`);
            console.error(error);
            console.log(`-------------------------------------------------\n`);
        }
    });
}

/**
 * Função que formata e imprime a comanda de um pedido com layout profissional.
 * @param {object} order O objeto completo do pedido.
 * @param {string | null} copyTitle Um título opcional para a via (ex: "VIA - COZINHA").
 */
async function printReceipt(order, copyTitle = null) {
    const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `printer:${PRINTER_NAME}`,
        characterSet: CharacterSet.PC850_MULTILINGUAL,
        removeSpecialCharacters: false,
        options:{
            timeout: 5000
        }
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
        throw new Error(`Impressora "${PRINTER_NAME}" não encontrada ou desconectada.`);
    }

    const now = new Date(order.created_at);
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    // --- MONTAGEM DA COMANDA COM NOVO LAYOUT ---

    try {
        await printer.printImage(LOGO_PATH);
        printer.newLine();
    } catch (imgError) {
        console.warn("Aviso: Logo não encontrado. Imprimindo apenas o nome da loja.");
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.println("Zap Esfirras");
        printer.setTextNormal();
    }

    printer.alignCenter();
    printer.println("Rua Fictícia, 123 - Centro, Mococa-SP");
    printer.println("CNPJ: 00.000.000/0001-00 | (19) 99143-2597");
    printer.drawLine();

    if (copyTitle) {
        printer.alignCenter();
        printer.bold(true);
        printer.println(copyTitle);
        printer.bold(false);
        printer.drawLine();
    }

    printer.alignCenter();
    printer.setTextSize(1, 1);
    if (order.delivery_info.tipo === 'Entrega' && order.delivery_number) {
        printer.println(order.delivery_number);
    } else if (order.delivery_info.tipo === 'Retirada') {
        printer.println("VEM RETIRAR");
    }
    printer.setTextNormal();
    printer.newLine();

    printer.alignLeft();
    printer.println(`Pedido: #${order.id} | Data: ${formattedDate}`);
    printer.println(`Cliente: ${order.client_info.nome}`);
    printer.drawLine();

    if (order.delivery_info.tipo === 'Entrega') {
        printer.bold(true);
        printer.println("ENDERECO DE ENTREGA:");
        printer.bold(false);
        printer.println(`${order.delivery_info.rua}, ${order.delivery_info.numero}`);
        printer.println(`Bairro: ${order.delivery_info.bairro}`);
        if (order.delivery_info.complemento) {
            printer.println(`Comp: ${order.delivery_info.complemento}`);
        }
        // --- BLOCO ADICIONADO AQUI ---
        if (order.delivery_info.referencia) {
            printer.println(`Ref: ${order.delivery_info.referencia}`);
        }
        printer.drawLine();
    }
    
    printer.tableCustom([
        { text: "QTD  DESCRICAO", align: "LEFT", width: 0.7, bold: true },
        { text: "VALOR", align: "RIGHT", width: 0.3, bold: true }
    ]);

    order.items.forEach(item => {
        printer.tableCustom([
            { text: `${item.quantity}x ${item.name}`, align: "LEFT", width: 0.7 },
            { text: formatCurrency(item.price * item.quantity), align: "RIGHT", width: 0.3 }
        ]);
        if (item.observacao) {
            printer.println(`  Obs: ${item.observacao}`);
        }
    });
    
    printer.drawLine();

    // --- CORREÇÃO IMPORTANTE NA LÓGICA DA TAXA ---
    // Primeiro, calcula o subtotal real dos itens, incluindo adicionais
    const subtotal = order.items.reduce((acc, item) => {
        const precoAdicionais = item.adicionais ? item.adicionais.reduce((sum, ad) => sum + (ad.price || 0), 0) : 0;
        const precoTotalItem = (parseFloat(item.price) + precoAdicionais) * item.quantity;
        return acc + precoTotalItem;
    }, 0);

    // A taxa de entrega é a diferença entre o total do pedido e o subtotal dos itens
    const taxaEntrega = order.total_value - subtotal;
    const descontos = 0; // Mantido como 0 por enquanto

    printer.tableCustom([ { text: "Subtotal", align: "LEFT" }, { text: formatCurrency(subtotal), align: "RIGHT" } ]);
    printer.tableCustom([ { text: "Taxa de Entrega", align: "LEFT" }, { text: formatCurrency(taxaEntrega), align: "RIGHT" } ]);
    printer.tableCustom([ { text: "Descontos", align: "LEFT" }, { text: formatCurrency(descontos), align: "RIGHT" } ]);
    printer.newLine();
    printer.setTextSize(0, 1);
    printer.bold(true);
    printer.tableCustom([ { text: "TOTAL", align: "LEFT" }, { text: formatCurrency(order.total_value), align: "RIGHT" } ]);
    printer.setTextNormal();
    printer.bold(false);
    
    printer.drawLine();

    printer.alignLeft();
    printer.bold(true);
    printer.println("FORMA DE PAGAMENTO:");
    printer.bold(false);
    
    let paymentDetails = `- ${order.payment_info.metodo}`;
    if (order.payment_info.tipo) { // Para Cartão (Crédito/Débito)
        paymentDetails += ` (${order.payment_info.tipo})`;
    }
    printer.println(paymentDetails);

    // Lógica para exibir o troco
    if (order.payment_info.metodo === 'Dinheiro' && order.payment_info.trocoPara > 0) {
        const change = order.payment_info.trocoPara - order.total_value;
        printer.println(`  Pagar com: ${formatCurrency(order.payment_info.trocoPara)}`);
        if (change >= 0) {
            printer.newLine();
            printer.bold(true);
            printer.println(`  LEVAR TROCO: ${formatCurrency(change)}`);
            printer.bold(false);
        }
    }
    
    printer.feed(3);
    printer.cut();
    
    await printer.execute();
}

function formatCurrency(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

initializePrinterService();