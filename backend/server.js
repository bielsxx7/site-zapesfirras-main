// Importa os módulos que instalamos
const express = require('express');
const cors = require('cors');
const pool = require('./db'); 

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- ROTAS DA API PARA PRODUTOS ---

// ROTA GET: Buscar todos os produtos (agora com JOIN para pegar o nome da categoria)
app.get('/api/products', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, c.name AS category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.id
            ORDER BY c.name, p.name
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar produtos." });
    }
});

// ROTA POST: Adicionar um novo produto (agora usa category_id)
app.post('/api/products', async (req, res) => {
    try {
        const { name, price, category_id, description, image, available } = req.body;
        const sql = "INSERT INTO products (name, price, category_id, description, image, available) VALUES (?, ?, ?, ?, ?, ?)";
        const [result] = await pool.query(sql, [name, price, category_id, description, image, available]);
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        res.status(500).json({ message: "Erro no servidor ao adicionar produto." });
    }
});

// ROTA PUT: Atualizar um produto existente
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category_id, description, image, available } = req.body;
        const sql = "UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, image = ?, available = ? WHERE id = ?";
        await pool.query(sql, [name, price, category_id, description, image, available, id]);
        res.json({ message: "Produto atualizado com sucesso." });
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar produto." });
    }
});

// ROTA DELETE: Excluir um produto
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "DELETE FROM products WHERE id = ?";
        await pool.query(sql, [id]);
        res.json({ message: "Produto excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        res.status(500).json({ message: "Erro no servidor ao excluir produto." });
    }
});

// --- ROTAS DA API PARA CATEGORIAS ---

// ROTA GET: Buscar todas as categorias
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM categories ORDER BY name");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar categorias." });
    }
});

// ROTA PUT: Atualizar uma categoria (renomear ou mudar visibilidade)
app.put('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, is_visible } = req.body;

        if (!name || is_visible === undefined) {
             return res.status(400).json({ message: 'Nome e visibilidade são obrigatórios.' });
        }

        const sql = "UPDATE categories SET name = ?, is_visible = ? WHERE id = ?";
        await pool.query(sql, [name, is_visible, id]);

        res.json({ message: `Categoria atualizada com sucesso.` });
    } catch (error) {
        console.error("Erro ao atualizar categoria:", error);
        res.status(500).json({ message: "Erro no servidor ao atualizar categoria." });
    }
});

// ROTA POST: Criar uma nova categoria
app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'O nome da categoria é obrigatório.' });
        }
        const sql = "INSERT INTO categories (name, is_visible) VALUES (?, ?)";
        const [result] = await pool.query(sql, [name, true]);
        res.status(201).json({ id: result.insertId, name, is_visible: true });
    } catch (error) {
        console.error("Erro ao criar categoria:", error);
        res.status(500).json({ message: "Erro no servidor ao criar categoria." });
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});