const express = require('express');
const app = express();
const PORT = 3000;

const db = require('./db'); 

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const apiRoutes = require('./routes/api');
app.use(express.json());
app.use('/api', apiRoutes);

const livrosRoutes = require('./routes/livros');
const emprestimosRoutes = require('./routes/emprestimos');

app.use('/api/livros', livrosRoutes);
app.use('/api/emprestimos', emprestimosRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req, res) => {
    res.json({ message: 'Bem-vindo à API do sistema de biblioteca!' });
});

app.get('/api/registrar', (req, res) => {
    res.json({ message: 'Rota de registro de usuário.' });
});



app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});