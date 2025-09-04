const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const pool = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- ROTAS DE PRODUTOS (ATUALIZADAS) ---
app.get('/api/products', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, c.name AS category_name, c.is_visible AS category_is_visible
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY c.display_order, c.name, p.name
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ message: "Erro no servidor." });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        // Adicionado 'custom_additions'
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
        // Adicionado 'custom_additions'
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

// --- O RESTANTE DO ARQUIVO (CATEGORIAS, PEDIDOS, ETC.) PERMANECE O MESMO ---
// ... (copie e cole o restante do seu server.js aqui)
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
        res.json({ message: "Status do pedido atualizado com sucesso." });
    } catch (error) {
        console.error(`Erro ao atualizar status do pedido #${req.params.id}:`, error);
        res.status(500).json({ message: "Erro no servidor ao atualizar o status." });
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