const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const auth = require('../middleware/auth');


router.post('/registrar', async (req, res) => {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const perfisValidos = ['bibliotecario', 'leitor']; 
    if (!perfisValidos.includes(perfil)) {
        return res.status(400).json({ error: 'Por favor insira um valor válido para perfil.' });
    }

    try {
        const senhaHasheada = await bcrypt.hash(senha, 10);

        db.query(
            'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)', 
            [nome, email, senhaHasheada, perfil],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
                    }
                    console.error('Erro no banco:', err);
                    return res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' });
                }
                res.status(201).json({ id: result.insertId, nome, email });
            }
        );
    } catch (error) {
        console.error('Erro no servidor:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        const query_email = 'SELECT * FROM usuarios WHERE email = ?';
        const results = await new Promise((resolve, reject) => {
            db.query(query_email, [email], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (!results || results.length === 0) {
            return res.status(401).json({ error: 'Email ou senha inválidos.' });
        }

        const usuario = results[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Email ou senha inválidos.' });
        }

        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
            'SEGREDO', 
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            message: 'Login efetuado com sucesso',
            token: token,
            usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil }
        });
    } catch (err) {
        console.error('Erro no servidor durante o login:', err);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

module.exports = router;