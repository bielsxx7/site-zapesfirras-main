const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const pool = require('./db');
const stringSimilarity = require("string-similarity");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET; 

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- CONFIGURAÇÃO DO MERCADO PAGO ---
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
});

// --- MIDDLEWARE DE AUTENTICAÇÃO (MOVIDO PARA CIMA PARA FICAR DISPONÍVEL GLOBALMENTE) ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido.' });
        }
        req.customerId = decoded.id;
        next();
    });
};
// ------------------------------------------------------------------------------------

const bairrosEspeciais = [
    {
        nomeOficial: 'conjunto habitacional gilberto rossetti',
        aliases: ['cohab 2', 'cohab ii', 'cohab2', 'gilberto rossetti']
    },
    {
        nomeOficial: 'loteamento residencial vale verde',
        aliases: ['vale verde', 'valeverde']
    },
    {
        nomeOficial: 'altos do vale ii',
        aliases: ['altos do vale ii', 'altos do vale 2', 'altos do vale']
    },
    {
        nomeOficial: 'parque dos manacas i',
        aliases: ['parque manacas', 'parque manacás', 'manacas', 'manacás', 'parque dos manacas i']
    },
    {
        nomeOficial: 'chacara palmeirinha',
        aliases: ['chacara palmeirinha', 'chacara da palmeirinha', 'palmeirinha']
    },
    {
        nomeOficial: 'chacara da pamonha',
        aliases: ['chacara da pamonha', 'pamonha', 'chacara pamonha', 'chacara das suculentas']
    },
    {
        nomeOficial: 'distrito industrial ii',
        aliases: ['distrito industrial 2', 'distrito 2', 'distrito industrial']
    }
];

app.post('/api/calculate-delivery-fee', (req, res) => {
    try {
        const { bairro } = req.body;
        if (!bairro) {
            return res.status(400).json({ message: "O nome do bairro é obrigatório." });
        }
        const bairroNormalizado = bairro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let taxa = 5.00;
        const SIMILARITY_THRESHOLD = 0.7;
        for (const bairroConfig of bairrosEspeciais) {
            let match = false;
            for (const alias of bairroConfig.aliases) {
                if (stringSimilarity.compareTwoStrings(bairroNormalizado, alias) >= SIMILARITY_THRESHOLD) {
                    match = true;
                    break;
                }
            }
            if (!match && bairroNormalizado.includes(bairroConfig.nomeOficial)) {
                match = true;
            }
            if (match) {
                taxa = 10.00;
                break;
            }
        }
        res.json({ taxaDeEntrega: taxa });
    } catch (error) {
        console.error("Erro ao calcular taxa de entrega:", error);
        res.status(500).json({ message: "Erro no servidor ao calcular a taxa." });
    }
});

// --- ROTA PARA CRIAR PREFERÊNCIA DE PAGAMENTO ---
app.post('/api/create-payment-preference', async (req, res) => {
    try {
        const { items } = req.body;

// Dentro de app.post('/api/create-payment-preference', ...)

const preferenceBody = {
    items: items.map(item => ({
        id: item.id,
        title: item.name,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: 'BRL'
    })),
    // As linhas back_urls e auto_return foram removidas para teste local
};

        const preference = new Preference(client);
        const response = await preference.create({ body: preferenceBody });
        
        console.log('Preferência do Mercado Pago criada:', response.id);
        res.json({ preferenceId: response.id });

    } catch (error) {
        console.error("Erro ao criar preferência do Mercado Pago:", error);
        res.status(500).json({ message: "Erro no servidor ao criar preferência de pagamento." });
    }
});


app.post('/api/mp-webhook', async (req, res) => {
    console.log('--- Webhook do Mercado Pago recebido ---');
    
    const { query } = req;
    const topic = query.topic || query.type;

    if (topic === 'payment') {
        const paymentId = query.id || query['data.id'];
        console.log('Tópico é pagamento, ID:', paymentId);

        try {
            // Usando a nova sintaxe da SDK V3 para buscar o pagamento
            const payment = await mercadopago.payment.findById(paymentId);

            if (payment) {
                console.log('Status do pagamento:', payment.status);
                
                // Pega o ID do nosso pedido que guardamos na referência externa
                const orderId = payment.external_reference;

                // Se o pagamento foi aprovado, atualizamos o status do nosso pedido
                if (payment.status === 'approved') {
                    const newStatus = 'Novo';
                    
                    // Atualiza o status no banco de dados
                    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId]);
                    
                    console.log(`Pedido #${orderId} atualizado para "${newStatus}" via webhook.`);

                    // Avisa o painel admin em tempo real que o status mudou
                    io.emit('order_status_updated', { orderId: orderId, newStatus: newStatus });
                }
            }
        } catch (error) {
            console.error('Erro ao processar webhook:', error);
        }
    }

    // Responde ao Mercado Pago para confirmar o recebimento
    res.sendStatus(200);
});

// --- ROTAS DE PRODUTOS ---
app.get('/api/products', async (req, res) => {
    try {
        const cleanupSql = "UPDATE products SET is_on_promo = false, promo_price = NULL, promo_expires_at = NULL WHERE is_on_promo = true AND promo_expires_at < NOW()";
        await pool.query(cleanupSql);
        
        const sql = `SELECT p.*, c.name AS category_name, c.is_visible AS category_is_visible FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY c.display_order, c.name, p.name`;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, price, category_id, description, image, available, custom_additions } = req.body;
        const sql = "INSERT INTO products (name, price, category_id, description, image, available, custom_additions) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const [result] = await pool.query(sql, [name, price, category_id, description, image, available, custom_additions ? JSON.stringify(custom_additions) : null]);
        io.emit('menu_updated');
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        res.status(500).json({ message: "Erro no servidor ao adicionar produto." });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category_id, description, image, available, custom_additions } = req.body;
        const sql = "UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, image = ?, available = ?, custom_additions = ? WHERE id = ?";
        await pool.query(sql, [name, price, category_id, description, image, available, custom_additions ? JSON.stringify(custom_additions) : null, id]);
        io.emit('menu_updated');
        res.json({ message: "Produto atualizado com sucesso." });
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar produto." });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "DELETE FROM products WHERE id = ?";
        await pool.query(sql, [id]);
        io.emit('menu_updated');
        res.json({ message: "Produto excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        res.status(500).json({ message: "Erro no servidor ao excluir produto." });
    }
});

app.put('/api/products/:id/promotion', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_on_promo, promo_price, duration_hours } = req.body;

        if (is_on_promo && (promo_price === null || promo_price === undefined)) {
            return res.status(400).json({ message: 'O preço promocional é obrigatório.' });
        }
        if (is_on_promo && (duration_hours === null || duration_hours === undefined || duration_hours <= 0)) {
            return res.status(400).json({ message: 'A duração em horas é obrigatória.' });
        }

        let promo_expires_at = null;
        if (is_on_promo) {
            const now = new Date();
            const durationInMilliseconds = parseFloat(duration_hours) * 60 * 60 * 1000;
            promo_expires_at = new Date(now.getTime() + durationInMilliseconds);
        }

        const finalPromoPrice = is_on_promo ? promo_price : null;

        const sql = "UPDATE products SET is_on_promo = ?, promo_price = ?, promo_expires_at = ? WHERE id = ?";
        await pool.query(sql, [is_on_promo, finalPromoPrice, promo_expires_at, id]);
        
        io.emit('menu_updated');

        res.json({ message: "Status da promoção atualizado com sucesso." });
    } catch (error) {
        console.error("Erro ao atualizar promoção do produto:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar promoção." });
    }
});

// --- ROTAS DE CATEGORIAS ---
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM categories WHERE is_visible = true ORDER BY display_order, name");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar categorias visíveis:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.get('/api/admin/categories', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM categories ORDER BY display_order, name");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar todas as categorias:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, is_visible } = req.body;
        if (!name || is_visible === undefined) {
             return res.status(400).json({ message: 'Nome e visibilidade são obrigatórios.' });
        }
        const sql = "UPDATE categories SET name = ?, is_visible = ? WHERE id = ?";
        await pool.query(sql, [name, is_visible, id]);
        io.emit('menu_updated');
        res.json({ message: `Categoria atualizada com sucesso.` });
    } catch (error) {
        console.error("Erro ao atualizar categoria:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'O nome da categoria é obrigatório.' });
        }
        const sql = "INSERT INTO categories (name, is_visible) VALUES (?, ?)";
        const [result] = await pool.query(sql, [name, true]);
        io.emit('menu_updated');
        res.status(201).json({ id: result.insertId, name, is_visible: true });
    } catch (error) {
        console.error("Erro ao criar categoria:", error);
        res.status(500).json({ message: "Erro no servidor ao criar categoria." });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkSql = "SELECT COUNT(*) AS productCount FROM products WHERE category_id = ?";
        const [rows] = await pool.query(checkSql, [id]);
        const productCount = rows[0].productCount;

        if (productCount > 0) {
            return res.status(400).json({ message: 'Não é possível excluir. Esta categoria contém produtos.' });
        }

        const deleteSql = "DELETE FROM categories WHERE id = ?";
        await pool.query(deleteSql, [id]);
        io.emit('menu_updated');
        res.json({ message: 'Categoria excluída com sucesso.' });
    } catch (error) {
        console.error("Erro ao excluir categoria:", error);
        res.status(500).json({ message: "Erro no servidor ao excluir categoria." });
    }
});

// =======================================================
// --- NOVAS ROTAS PARA GERENCIAR RECOMPENSAS (ZAPCLUBE) ---
// =======================================================

// Rota para listar TODAS as recompensas para o painel admin
app.get('/api/admin/rewards', async (req, res) => {
    try {
        const [rewards] = await pool.query("SELECT r.*, p.name as product_name, p.price as product_price FROM rewards r LEFT JOIN products p ON r.product_id = p.id ORDER BY r.points_cost ASC");
        res.json(rewards);
    } catch (error) {
        console.error("Erro ao buscar recompensas:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar recompensas." });
    }
});

// Rota PÚBLICA para o cliente ver as recompensas ativas
app.get('/api/rewards', async (req, res) => {
    try {
        const [rewards] = await pool.query("SELECT id, name, description, points_cost FROM rewards WHERE is_active = true ORDER BY points_cost ASC");
        res.json(rewards);
    } catch (error) {
        console.error("Erro ao buscar recompensas ativas:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.post('/api/rewards/redeem', verifyToken, async (req, res) => {
    try {
        const { rewardId } = req.body;
        const customerId = req.customerId;

        const [rewards] = await pool.query("SELECT * FROM rewards WHERE id = ?", [rewardId]);
        const [customers] = await pool.query("SELECT points FROM customers WHERE id = ?", [customerId]);

        if (rewards.length === 0 || customers.length === 0) {
            return res.status(404).json({ message: "Recompensa ou cliente não encontrado." });
        }
        
        const reward = rewards[0];
        const customer = customers[0];

        if (customer.points < reward.points_cost) {
            return res.status(403).json({ message: "Pontos insuficientes para resgatar este prêmio." });
        }

        const newPoints = customer.points - reward.points_cost;
        await pool.query("UPDATE customers SET points = ? WHERE id = ?", [newPoints, customerId]);

        const logSql = "INSERT INTO points_log (customer_id, reward_id, points_change, description) VALUES (?, ?, ?, ?)";
        const description = `${reward.points_cost} pontos resgatados por: ${reward.name}`;
        await pool.query(logSql, [customerId, reward.id, -reward.points_cost, description]);
        
        console.log(`Cliente ${customerId} resgatou ${reward.name} por ${reward.points_cost} pontos.`);

        const [products] = await pool.query("SELECT * FROM products WHERE id = ?", [reward.product_id]);
        if (products.length === 0) {
            return res.status(404).json({ message: "O produto associado a esta recompensa não existe mais." });
        }

        res.json({
            message: "Recompensa resgatada com sucesso!",
            newPointsBalance: newPoints,
            rewardedItem: products[0]
        });

    } catch (error) {
        console.error("Erro ao resgatar recompensa:", error);
        res.status(500).json({ message: "Erro no servidor ao tentar resgatar a recompensa." });
    }
});

// Rota para o admin criar uma nova recompensa (com a calculadora inteligente)
app.post('/api/admin/rewards', async (req, res) => {
    try {
        const { name, description, productId, difficulty, points_cost_manual } = req.body;
        let points_cost = 0;

        if (points_cost_manual && points_cost_manual > 0) {
            points_cost = points_cost_manual;
        } 
        else if (productId && difficulty) {
            const [products] = await pool.query("SELECT price FROM products WHERE id = ?", [productId]);
            if (products.length === 0) {
                return res.status(404).json({ message: "Produto base para a recompensa não encontrado." });
            }
            const productPrice = parseFloat(products[0].price);
            
            let returnPercentage = 0.07;
            if (difficulty === 'easy') returnPercentage = 0.10;
            if (difficulty === 'hard') returnPercentage = 0.04;

            const spendingNeeded = productPrice / returnPercentage;
            const calculatedPoints = spendingNeeded / 2;
            
            points_cost = Math.ceil(calculatedPoints / 5) * 5;
        } else {
             return res.status(400).json({ message: "É necessário fornecer um produto e dificuldade ou um custo manual de pontos." });
        }

        const sql = "INSERT INTO rewards (name, description, points_cost, product_id, is_active) VALUES (?, ?, ?, ?, ?)";
        const [result] = await pool.query(sql, [name, description, points_cost, productId || null, true]);

        res.status(201).json({ message: "Recompensa criada com sucesso!", id: result.insertId });

    } catch (error) {
        console.error("Erro ao criar recompensa:", error);
        res.status(500).json({ message: "Erro no servidor ao criar recompensa." });
    }
});

// Rota para o admin ATUALIZAR uma recompensa
app.put('/api/admin/rewards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, points_cost, is_active } = req.body;

        const sql = "UPDATE rewards SET name = ?, description = ?, points_cost = ?, is_active = ? WHERE id = ?";
        await pool.query(sql, [name, description, points_cost, is_active, id]);

        res.json({ message: "Recompensa atualizada com sucesso." });
    } catch (error) {
        console.error("Erro ao atualizar recompensa:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar recompensa." });
    }
});

// Rota para o admin DELETAR uma recompensa
app.delete('/api/admin/rewards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM rewards WHERE id = ?", [id]);
        res.json({ message: "Recompensa excluída com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir recompensa:", error);
        res.status(500).json({ message: "Não foi possível excluir. Verifique se esta recompensa já foi resgatada por algum cliente." });
    }
});

// Rota auxiliar para o modal de recompensas pegar a lista de produtos
app.get('/api/admin/products-list', async (req, res) => {
    try {
        const [products] = await pool.query("SELECT id, name, price FROM products ORDER BY name ASC");
        res.json(products);
    } catch (error) {
        console.error("Erro ao listar produtos:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

// --- ROTAS DE PEDIDOS ---
app.get('/api/orders', async (req, res) => {
    try {
        const [orders] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
        res.json(orders);
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar pedidos." });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { client_info, delivery_info, items, total_value, payment_info, status, customerId } = req.body;
        const sql = `INSERT INTO orders (client_info, delivery_info, items, total_value, payment_info, status) VALUES (?, ?, ?, ?, ?, ?)`;
        
        const [result] = await pool.query(sql, [
            JSON.stringify(client_info), 
            JSON.stringify(delivery_info), 
            JSON.stringify(items), 
            total_value, 
            JSON.stringify(payment_info), 
            status || 'Novo'
        ]);

        const newOrderId = result.insertId;
        console.log(`Novo pedido #${newOrderId} inserido no banco de dados.`);

        const [orderRows] = await pool.query("SELECT * FROM orders WHERE id = ?", [newOrderId]);
        const newOrder = orderRows[0];

        if (customerId && total_value > 0) {
            const pointsEarned = Math.floor(total_value / 2);

            if (pointsEarned > 0) {
                const customerUpdateSql = "UPDATE customers SET points = points + ? WHERE id = ?";
                await pool.query(customerUpdateSql, [pointsEarned, customerId]);

                const logSql = "INSERT INTO points_log (customer_id, order_id, points_change, description) VALUES (?, ?, ?, ?)";
                const description = `${pointsEarned} pontos ganhos no pedido #${newOrderId}`;
                await pool.query(logSql, [customerId, newOrderId, pointsEarned, description]);
                
                console.log(`Registrado: +${pointsEarned} pontos para o cliente ID ${customerId} do pedido #${newOrderId}.`);
            }
        }

        io.emit('new_order', newOrder);
        io.emit('print_new_order', newOrder);

        res.status(201).json({ message: "Pedido criado com sucesso!", orderId: newOrderId });

    } catch (error) {
        console.error("ERRO AO SALVAR PEDIDO NO BANCO:", error);
        res.status(500).json({ message: "Erro no servidor ao criar pedido.", error: error.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, delivery_number } = req.body;
        let sql = 'UPDATE orders SET status = ?';
        const params = [status];
        if (delivery_number) {
            sql += ', delivery_number = ?';
            params.push(delivery_number);
        }
        sql += ' WHERE id = ?';
        params.push(id);
        await pool.query(sql, params);

        console.log(`Status do pedido #${id} atualizado para "${status}".`);
        
        io.emit('order_status_updated', { orderId: id, newStatus: status });

        res.json({ message: "Status do pedido atualizado com sucesso." });

    } catch (error) {
        console.error(`Erro ao atualizar status do pedido #${req.params.id}:`, error);
        res.status(500).json({ message: "Erro no servidor ao atualizar o status." });
    }
});

// --- ROTAS DE CLIENTES (AUTH) ---

app.post('/api/customers/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        const [existingPhone] = await pool.query("SELECT id FROM customers WHERE phone = ?", [phone]);
        if (existingPhone.length > 0) {
            return res.status(409).json({ message: 'Este telefone já está cadastrado.' });
        }

        const [existingEmail] = await pool.query("SELECT id FROM customers WHERE email = ?", [email]);
        if (existingEmail.length > 0) {
            return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = "INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)";
        const [result] = await pool.query(sql, [name, email, phone, hashedPassword]);

        res.status(201).json({ message: "Cadastro realizado com sucesso!", customerId: result.insertId });

    } catch (error) {
        console.error("Erro no cadastro de cliente:", error);
        res.status(500).json({ message: "Erro no servidor ao realizar cadastro." });
    }
});

app.post('/api/customers/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) {
            return res.status(400).json({ message: 'Telefone e senha são obrigatórios.' });
        }
        const [users] = await pool.query("SELECT * FROM customers WHERE phone = ?", [phone]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            message: "Login bem-sucedido!", 
            token: token,
            customer: { id: user.id, name: user.name, phone: user.phone }
        });
    } catch (error) {
        console.error("Erro no login do cliente:", error);
        res.status(500).json({ message: "Erro no servidor ao fazer login." });
    }
});

app.get('/api/customers/me', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, name, phone, points FROM customers WHERE id = ?", [req.customerId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.get('/api/customers/me/addresses', verifyToken, async (req, res) => {
    try {
        const [addresses] = await pool.query("SELECT * FROM customer_addresses WHERE customer_id = ?", [req.customerId]);
        res.json(addresses);
    } catch (error) {
        console.error("Erro ao buscar endereços do cliente:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar endereços." });
    }
});

app.post('/api/customers/me/addresses', verifyToken, async (req, res) => {
    try {
        const { alias, cep, street, number, neighborhood, complement, reference } = req.body;
        if (!alias || !cep || !street || !number || !neighborhood) {
            return res.status(400).json({ message: 'Campos obrigatórios do endereço não foram preenchidos.' });
        }
        const sql = "INSERT INTO customer_addresses (customer_id, alias, cep, street, number, neighborhood, complement, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const [result] = await pool.query(sql, [req.customerId, alias, cep, street, number, neighborhood, complement, reference]);
        res.status(201).json({ message: "Endereço adicionado com sucesso!", addressId: result.insertId });
    } catch (error) {
        console.error("Erro ao adicionar endereço:", error);
        res.status(500).json({ message: "Erro no servidor ao adicionar endereço." });
    }
});

app.delete('/api/customers/me/addresses/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?", [id, req.customerId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Endereço não encontrado ou não pertence a este usuário.' });
        }

        res.json({ message: 'Endereço excluído com sucesso.' });
    } catch (error) {
        console.error("Erro ao excluir endereço:", error);
        res.status(500).json({ message: "Erro no servidor ao excluir endereço." });
    }
});

app.post('/api/customers/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await pool.query("SELECT * FROM customers WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.json({ message: 'Se um e-mail cadastrado for encontrado, um link de redefinição será enviado.' });
        }
        const user = users[0];

        const token = crypto.randomBytes(20).toString('hex');
        const expires = Date.now() + 3600000;

        await pool.query(
            "UPDATE customers SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
            [token, expires, user.id]
        );

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetLink = `http://127.0.0.1:5500/frontend/resetar-senha.html?token=${token}`;
        const mailOptions = {
            from: `"Zap Esfirras" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Redefinição de Senha - Zap Esfirras',
            html: `
                <p>Olá, ${user.name}!</p>
                <p>Você solicitou a redefinição da sua senha. Clique no link abaixo para criar uma nova senha:</p>
                <a href="${resetLink}" style="font-size: 16px;">Redefinir Minha Senha</a>
                <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
                <p>Este link é válido por 1 hora.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Se um e-mail cadastrado for encontrado, um link de redefinição será enviado.' });

    } catch (error) {
        console.error("Erro em /forgot-password:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.post('/api/customers/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        const [users] = await pool.query(
            "SELECT * FROM customers WHERE password_reset_token = ? AND password_reset_expires > ?",
            [token, Date.now()]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Token de redefinição inválido ou expirado.' });
        }
        const user = users[0];

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            "UPDATE customers SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
            [hashedPassword, user.id]
        );

        res.json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
        console.error("Erro em /reset-password:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

// --- ROTAS DE ADMIN ---
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
        }

        const [admins] = await pool.query("SELECT * FROM admins WHERE username = ?", [username]);
        if (admins.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '8h' });

        res.json({
            message: "Login de administrador bem-sucedido!",
            token: token,
            admin: { username: admin.username }
        });

    } catch (error) {
        console.error("Erro no login do administrador:", error);
        res.status(500).json({ message: "Erro no servidor ao fazer login do admin." });
    }
});

// --- ROTA PARA VALIDAR CUPONS ---
app.post('/api/coupons/validate', async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;

        if (!couponCode) {
            return res.status(400).json({ message: 'O código do cupom é obrigatório.' });
        }

        const [coupons] = await pool.query("SELECT * FROM coupons WHERE code = ? AND is_active = true", [couponCode.toUpperCase()]);

        if (coupons.length === 0) {
            return res.status(404).json({ message: 'Cupom inválido ou expirado.' });
        }

        const coupon = coupons[0];

        if (subtotal < coupon.min_purchase_value) {
            const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return res.status(400).json({ message: `Este cupom requer um pedido mínimo de ${formatCurrency(coupon.min_purchase_value)}.` });
        }
        
        res.json({
            message: 'Cupom aplicado com sucesso!',
            coupon: coupon
        });

    } catch (error) {
        console.error("Erro ao validar cupom:", error);
        res.status(500).json({ message: "Erro no servidor ao validar o cupom." });
    }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('Um cliente se conectou via WebSocket:', socket.id);
    socket.on('disconnect', () => {
        console.log('Cliente desconectou:', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});