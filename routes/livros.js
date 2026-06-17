const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticar } = require('../middleware/auth');

const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

router.get('/', autenticar, async (req, res) => {
    try {
        const livros = await queryAsync('SELECT * FROM livros', []);
        res.status(200).json(livros);
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        res.status(500).json({ error: 'Erro ao buscar o catálogo de livros.' });
    }
});

router.post('/', autenticar, async (req, res) => {
    if (req.usuario.perfil !== 'bibliotecario') {
        return res.status(403).json({ error: 'Acesso negado. Apenas bibliotecários podem cadastrar livros.' });
    }

    const { titulo, autor, ano_publicacao, quantidade_disponivel } = req.body;

    if (!titulo || !autor || quantidade_disponivel === undefined) {
        return res.status(400).json({ error: 'Título, autor e quantidade são obrigatórios.' });
    }

    try {
        const sql = 'INSERT INTO livros (titulo, autor, ano_publicacao, quantidade_disponivel) VALUES (?, ?, ?, ?)';
        const result = await queryAsync(sql, [titulo, autor, ano_publicacao, quantidade_disponivel]);
        
        res.status(201).json({ message: 'Livro cadastrado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error('Erro ao cadastrar livro:', error);
        res.status(500).json({ error: 'Erro ao cadastrar livro no banco de dados.' });
    }
});

router.put('/:id', autenticar, async (req, res) => {
    if (req.usuario.perfil !== 'bibliotecario') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    const livroId = req.params.id;
    const { titulo, autor, ano_publicacao, quantidade_disponivel } = req.body;

    try {
        const sql = 'UPDATE livros SET titulo = ?, autor = ?, ano_publicacao = ?, quantidade_disponivel = ? WHERE id = ?';
        await queryAsync(sql, [titulo, autor, ano_publicacao, quantidade_disponivel, livroId]);
        
        res.status(200).json({ message: 'Livro atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar o livro.' });
    }
});

router.delete('/:id', autenticar, async (req, res) => {
    if (req.usuario.perfil !== 'bibliotecario') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    const livroId = req.params.id;

    try {
        await queryAsync('DELETE FROM livros WHERE id = ?', [livroId]);
        res.status(200).json({ message: 'Livro removido com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover o livro.' });
    }
});

module.exports = router;
