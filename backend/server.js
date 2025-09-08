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

// DICIONÁRIO DE BAIRROS ESPECIAIS
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

// ROTA PARA CALCULAR TAXA DE ENTREGA
app.post('/api/calculate-delivery-fee', (req, res) => {
    try {
        const { bairro } = req.body;
        if (!bairro) {
            return res.status(400).json({ message: "O nome do bairro é obrigatório." });
        }

        const bairroNormalizado = bairro.toLowerCase()
                                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                        .trim();

        let taxa = 5.00; // Taxa padrão
        const SIMILARITY_THRESHOLD = 0.7;

        for (const bairroConfig of bairrosEspeciais) {
            let match = false;

            for (const alias of bairroConfig.aliases) {
                const similaridade = stringSimilarity.compareTwoStrings(bairroNormalizado, alias);
                if (similaridade >= SIMILARITY_THRESHOLD) {
                    match = true;
                    break;
                }
            }

            if (!match && bairroNormalizado.includes(bairroConfig.nomeOficial)) {
                match = true;
            }

            if (match) {
                taxa = 10.00; // Taxa para bairros especiais/distantes
                break;
            }
        }
        
        res.json({ taxaDeEntrega: taxa });

    } catch (error) {
        console.error("Erro ao calcular taxa de entrega:", error);
        res.status(500).json({ message: "Erro no servidor ao calcular a taxa." });
    }
});


// --- ROTAS DE PRODUTOS ---
app.get('/api/products', async (req, res) => {
    try {
        // CORREÇÃO: Removido o espaço em branco antes do SELECT
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
        const { client_info, delivery_info, items, total_value, payment_info, status } = req.body;
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
        const [users] = await pool.query("SELECT id, name, phone FROM customers WHERE id = ?", [req.customerId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

// =======================================================================
// === NOVO BLOCO DE ROTAS PARA GERENCIAMENTO DE ENDEREÇOS ===
// =======================================================================
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
// =======================================================================
// === FIM DO NOVO BLOCO DE ROTAS ===
// =======================================================================


app.post('/api/customers/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await pool.query("SELECT * FROM customers WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.json({ message: 'Se um e-mail cadastrado for encontrado, um link de redefinição será enviado.' });
        }
        const user = users[0];

        const token = crypto.randomBytes(20).toString('hex');
        const expires = Date.now() + 3600000; // 1 hora em milissegundos

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