// Importa os módulos que instalamos
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importa nossa conexão com o banco de dados

const app = express();
const port = 3000;

// Configurações do servidor
app.use(cors());
app.use(express.json());

// --- ROTAS DA API PARA PRODUTOS ---

// ROTA GET: Buscar todos os produtos
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM products ORDER BY category, name");
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar produtos." });
    }
});

// ROTA POST: Adicionar um novo produto
app.post('/api/products', async (req, res) => {
    try {
        const { name, price, category, description, image, available } = req.body;
        const sql = "INSERT INTO products (name, price, category, description, image, available) VALUES (?, ?, ?, ?, ?, ?)";
        const [result] = await pool.query(sql, [name, price, category, description, image, available]);
        res.status(201).json({ id: result.insertId, name, price, category });
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        res.status(500).json({ message: "Erro no servidor ao adicionar produto." });
    }
});

// ROTA PUT: Atualizar um produto existente
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category, description, image, available } = req.body;
        const sql = "UPDATE products SET name = ?, price = ?, category = ?, description = ?, image = ?, available = ? WHERE id = ?";
        await pool.query(sql, [name, price, category, description, image, available, id]);
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


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});