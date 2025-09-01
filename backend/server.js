// Importa os módulos que instalamos
const express = require('express');
const cors = require('cors');

// Inicializa o Express
const app = express();
const port = 3000; // A porta onde nosso back-end vai rodar

// Configurações do servidor
app.use(cors()); // Permite que o front-end acesse o back-end
app.use(express.json()); // Permite que o servidor entenda dados em formato JSON

// Rota de teste
app.get('/', (req, res) => {
    res.send('Servidor do Zap Esfirras com MySQL está funcionando!');
});

// Inicia o servidor e o faz "ouvir" por requisições
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});