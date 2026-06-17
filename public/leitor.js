const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const perfil = localStorage.getItem('userPerfil');

if (!token || perfil !== 'leitor') {
    alert('Acesso negado! Por favor, faça login.');
    window.location.href = 'index.html';
}

const feedbackMsg = document.getElementById('feedback-msg');

function showFeedback(text, type) {
    feedbackMsg.innerText = text;
    feedbackMsg.className = `message ${type}`;
    feedbackMsg.style.display = 'block';
}

function clearFeedback() {
    feedbackMsg.innerText = '';
    feedbackMsg.className = 'message';
    feedbackMsg.style.display = 'none';
}

const obterHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

let meusEmprestimosGlobais = [];

async function inicializarDados() {
    await carregarEmprestimos();
    await carregarLivros();      
}


async function carregarLivros() {
    try {
        const response = await fetch(`${API_URL}/livros`, { method: 'GET', headers: obterHeaders() });
        const livros = await response.json();
        if (!response.ok) throw new Error(livros.error || 'Erro ao carregar livros.');
        
        renderizarTabelaLivros(livros);
    } catch (error) {
        showFeedback(error.message, 'error');
    }
}

function renderizarTabelaLivros(livros) {
    const tbody = document.getElementById('livros-list');
    tbody.innerHTML = '';

    livros.forEach(livro => {
        const tr = document.createElement('tr');
        const estaEsgotado = livro.quantidade_disponivel <= 0;

        const jaSolicitado = meusEmprestimosGlobais.find(emp => emp.livro_id === livro.id && emp.status !== 'devolvido');

        let botaoConfig = '';

        if (jaSolicitado) {
            botaoConfig = `<button class="btn-tabela" disabled style="background-color: #e0a800; color: white; cursor: not-allowed; font-weight: bold;">
                ${jaSolicitado.data_devolucao_real ? 'Aguardando Devolução...' : 'Aguardando Entrega...'}
            </button>`;
        } else if (estaEsgotado) {
            botaoConfig = `<button class="btn-tabela" disabled style="background-color:#ccc; cursor:not-allowed;">Esgotado</button>`;
        } else {
            botaoConfig = `<button class="btn-tabela" onclick="solicitarEmprestimo(${livro.id})">Solicitar</button>`;
        }

        tr.innerHTML = `
            <td>${livro.id}</td>
            <td><strong>${livro.titulo}</strong></td>
            <td>${livro.autor}</td>
            <td>${livro.ano_publicacao || '-'}</td>
            <td>${livro.quantidade_disponivel}</td>
            <td>${botaoConfig}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function solicitarEmprestimo(livroId) {
    clearFeedback();
    try {
        const response = await fetch(`${API_URL}/emprestimos`, {
            method: 'POST',
            headers: obterHeaders(),
            body: JSON.stringify({ livro_id: livroId })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao solicitar empréstimo.');

        showFeedback('Empréstimo realizado com sucesso! Verifique a tabela abaixo.', 'success');
        await inicializarDados();
    } catch (error) {
        showFeedback(error.message, 'error');
    }
}

async function carregarEmprestimos() {
    try {
        const response = await fetch(`${API_URL}/emprestimos`, { method: 'GET', headers: obterHeaders() });
        const emprestimos = await response.json();
        if (!response.ok) throw new Error(emprestimos.error || 'Erro ao carregar seus empréstimos.');
        
        meusEmprestimosGlobais = emprestimos;
        renderizarTabelaEmprestimos(emprestimos);
    } catch (error) {
        showFeedback(error.message, 'error');
    }
}

function renderizarTabelaEmprestimos(emprestimos) {
    const tbody = document.getElementById('emprestimos-list');
    tbody.innerHTML = '';

    if (emprestimos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#777;">Você não possui empréstimos registrados.</td></tr>`;
        return;
    }

    emprestimos.forEach(emp => {
        const tr = document.createElement('tr');
        const dataEmprestimo = new Date(emp.data_emprestimo).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const dataPrevista = new Date(emp.data_devolucao_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        let botaoAcao = '';
        let textoStatusVisual = '';

        if (emp.status === 'ativo' && emp.data_devolucao_real) {
            textoStatusVisual = 'Aguardando Aprovação...'; 
            botaoAcao = `<span style="color: #e0a800; font-weight: bold;">Solicitado</span>`;
        } else if (emp.status === 'ativo') {
            textoStatusVisual = 'Em Uso (Ativo)';
            botaoAcao = `<button class="btn-tabela btn-devolver" onclick="solicitarDevolucao(${emp.id})">Solicitar Devolução</button>`;
        } else {
            textoStatusVisual = 'Devolvido';
            botaoAcao = `<span style="color: #28a745; font-weight: bold;">✔ Concluído</span>`;
        }

        tr.innerHTML = `
            <td><strong>${emp.nome_livro}</strong></td>
            <td>${dataEmprestimo}</td>
            <td>${dataPrevista}</td>
            <td>
                <span class="status-badge status-${emp.status}">
                    ${textoStatusVisual.toUpperCase()}
                </span>
            </td>
            <td>${botaoAcao}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function solicitarDevolucao(emprestimoId) {
    clearFeedback();
    try {
        const response = await fetch(`${API_URL}/emprestimos/${emprestimoId}/solicitar-devolucao`, {
            method: 'PUT',
            headers: obterHeaders()
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao processar solicitação.');

        alert(`Solicitação do empréstimo #${emprestimoId} enviada! Entregue o livro físico ao bibliotecário.`);
        showFeedback('Solicitação de devolução registrada com sucesso!', 'success');
        
        await inicializarDados();
    } catch (error) {
        showFeedback(error.message, 'error');
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userPerfil');
    window.location.href = 'index.html';
});

document.addEventListener('DOMContentLoaded', () => {
    clearFeedback();
    inicializarDados();
});
