const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// função auxiliar para o mysql
const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

// CRIAR EMPRÉSTIMO (POST)
router.post('/', auth, async (req, res) => {
    // regra: apenas leitores podem solicitar empréstimos
    if (req.usuario.perfil !== 'leitor') {
        return res.status(403).json({ error: 'Apenas leitores podem solicitar empréstimos.' });
    }

    const { livro_id } = req.body;
    const leitor_id = req.usuario.id; // ID do token de segurança

    try {
        // verificando se o livro existe e se tem estoque
        const livros = await queryAsync('SELECT quantidade_disponivel FROM livros WHERE id = ?', [livro_id]);
        
        if (livros.length === 0) return res.status(404).json({ error: 'Livro não encontrado.' });
        if (livros[0].quantidade_disponivel <= 0) return res.status(400).json({ error: 'Livro fora de estoque no momento.' });

        // calculando as datas hj e daqui a 7 dias
        const hoje = new Date();
        const dataDevolucaoPrevista = new Date();
        dataDevolucaoPrevista.setDate(hoje.getDate() + 7); // prazo de 7 diaas

        // mudando para o padrão do mysql (YYYY-MM-DD)
        const data_emprestimo = hoje.toISOString().split('T')[0];
        const data_prevista = dataDevolucaoPrevista.toISOString().split('T')[0];

        // salvando o empréstimo (status nasce como 'ativo')
        const sqlEmprestimo = `INSERT INTO emprestimos (livro_id, leitor_id, data_emprestimo, data_devolucao_prevista, status) VALUES (?, ?, ?, ?, 'ativo')`;
        await queryAsync(sqlEmprestimo, [livro_id, leitor_id, data_emprestimo, data_prevista]);

        // diminuindo o estoque do livro
        await queryAsync('UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?', [livro_id]);

        res.status(201).json({ message: 'Empréstimo realizado com sucesso!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar o empréstimo.' });
    }
});


// LISTAR EMPRÉSTIMOS (GET)
router.get('/', auth, async (req, res) => {
    try {
        let sql = `
            SELECT e.*, l.titulo AS nome_livro, u.nome AS nome_leitor 
            FROM emprestimos e
            JOIN livros l ON e.livro_id = l.id
            JOIN usuarios u ON e.leitor_id = u.id
        `;
        let params = [];

        // se for leitor pedidno, ve apenas os dele. se for bibliotecário, v6e todos.
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


// APROVAR DEVOLUÇÃO (PUT)
router.put('/:id/devolucao', auth, async (req, res) => {
    if (req.usuario.perfil !== 'bibliotecario') {
        return res.status(403).json({ error: 'Apenas bibliotecários podem aprovar devoluções.' });
    }

    const emprestimoId = req.params.id;

    try {
        //anchando o livro
        const emprestimos = await queryAsync('SELECT livro_id, status FROM emprestimos WHERE id = ?', [emprestimoId]);
        
        if (emprestimos.length === 0) return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        if (emprestimos[0].status === 'devolvido') return res.status(400).json({ error: 'Este livro já foi devolvido.' });

        const livroId = emprestimos[0].livro_id;
        const hoje = new Date().toISOString().split('T')[0]; // Data real da entrega

        // atualizando o empréstimo para 'devolvido'
        await queryAsync(`UPDATE emprestimos SET status = 'devolvido', data_devolucao_real = ? WHERE id = ?`, [hoje, emprestimoId]);

        // devolvendo o livro (estoque aumenta)
        await queryAsync('UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?', [livroId]);

        res.status(200).json({ message: 'Devolução aprovada com sucesso! Estoque atualizado.' });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar devolução.' });
    }
});

module.exports = router;