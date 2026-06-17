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

router.post('/', autenticar, async (req, res) => {
    if (req.usuario.perfil !== 'leitor') {
        return res.status(403).json({ error: 'Apenas leitores podem solicitar empréstimos.' });
    }

    const { livro_id } = req.body;
    const leitor_id = req.usuario.id;

    try {
        const libros = await queryAsync('SELECT quantidade_disponivel FROM livros WHERE id = ?', [livro_id]);
        
        if (libros.length === 0) return res.status(404).json({ error: 'Livro não encontrado.' });
        if (libros[0].quantidade_disponivel <= 0) return res.status(400).json({ error: 'Livro fora de estoque no momento.' });

        const hoje = new Date();
        const dataDevolucaoPrevista = new Date();
        dataDevolucaoPrevista.setDate(hoje.getDate() + 7);

        const data_emprestimo = hoje.toISOString().split('T')[0];
        const data_prevista = dataDevolucaoPrevista.toISOString().split('T')[0];

        const sqlEmprestimo = `INSERT INTO emprestimos (livro_id, leitor_id, data_emprestimo, data_devolucao_prevista, status) VALUES (?, ?, ?, ?, 'ativo')`;
        await queryAsync(sqlEmprestimo, [livro_id, leitor_id, data_emprestimo, data_prevista]);

        await queryAsync('UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?', [livro_id]);

        res.status(201).json({ message: 'Empréstimo realizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar o empréstimo.' });
    }
});

router.get('/', autenticar, async (req, res) => {
    try {
        let sql = `
            SELECT e.*, l.titulo AS nome_livro, u.nome AS nome_leitor 
            FROM emprestimos e
            JOIN livros l ON e.livro_id = l.id
            JOIN usuarios u ON e.leitor_id = u.id
        `;
        let params = [];

        if (req.usuario.perfil === 'leitor') {
            sql += ' WHERE e.leitor_id = ?';
            params.push(req.usuario.id);
        }

        const emprestimos = await queryAsync(sql, params);
        res.status(200).json(emprestimos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar empréstimos.' });
    }
});

router.put('/:id/solicitar-devolucao', autenticar, async (req, res) => {
    if (req.usuario.perfil !== 'leitor') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    const emprestimoId = req.params.id;
    const hoje = new Date().toISOString().split('T')[0];

    try {
        const emprestimos = await queryAsync('SELECT status FROM emprestimos WHERE id = ? AND leitor_id = ?', [emprestimoId, req.usuario.id]);
        if (emprestimos.length === 0) return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        if (emprestimos[0].status === 'devolvido') return res.status(400).json({ error: 'Este livro já foi devolvido.' });

        await queryAsync(`UPDATE emprestimos SET data_devolucao_real = ? WHERE id = ?`, [hoje, emprestimoId]);
        
        res.status(200).json({ message: 'Solicitação registrada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar solicitação de devolução.' });
    }
});


router.put('/:id/devolucao', autenticar, async (req, res) => {
    if (req.usuario.perfil !== 'bibliotecario') {
        return res.status(403).json({ error: 'Apenas bibliotecários podem aprovar devoluções.' });
    }

    const emprestimoId = req.params.id;

    try {
        const emprestimos = await queryAsync('SELECT livro_id, status FROM emprestimos WHERE id = ?', [emprestimoId]);
        
        if (emprestimos.length === 0) return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        if (emprestimos[0].status === 'devolvido') return res.status(400).json({ error: 'Este livro já foi devolvido.' });

        const livroId = emprestimos[0].livro_id;
        const hoje = new Date().toISOString().split('T')[0];

        await queryAsync(`UPDATE emprestimos SET status = 'devolvido', data_devolucao_real = ? WHERE id = ?`, [hoje, emprestimoId]);
        await queryAsync('UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?', [livroId]);

        res.status(200).json({ message: 'Devolução aprovada com sucesso! Estoque atualizado.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar devolução.' });
    }
});

module.exports = router;
