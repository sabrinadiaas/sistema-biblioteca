const express = require('express');
const app = express();
app.use(express.json());

const db = require('./db'); 

app.use(express.static('public'));

const apiRoutes = require('./routes/api');
app.use('/api/users', apiRoutes);

app.get('/api', (req, res) => {
    res.send('API da Biblioteca rodando perfeitamente!');
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});