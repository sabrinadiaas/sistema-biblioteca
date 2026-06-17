const API_URL = 'http://localhost:3000/api';

const token = localStorage.getItem('token');
const userPerfil = localStorage.getItem('userPerfil');

if (!token || userPerfil !== 'bibliotecario') {
    alert('Acesso negado. Por favor, faça login como bibliotecário.');
    window.location.href = 'index.html';
}

const feedbackPanel = document.getElementById('feedback-panel');
const livrosTbody = document.getElementById('livros-tbody');
const emprestimosTbody = document.getElementById('emprestimos-tbody');
const livroForm = document.getElementById('livro-form');

const inputId = document.getElementById('livro-id');
const inputTitulo = document.getElementById('livro-titulo');
const inputAutor = document.getElementById('livro-autor');
const inputAno = document.getElementById('livro-ano');
const inputQtd = document.getElementById('livro-qtd');
const saveBtn = document.getElementById('save-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formTitle = document.getElementById('form-title');

function showMessage(text, type) {
    feedbackPanel.innerText = text;
    feedbackPanel.className = `message ${type}`;
    setTimeout(() => {
        feedbackPanel.innerText = '';
        feedbackPanel.className = 'message';
    }, 5000);
}

async function carregarLivros() {
    try {
        const response = await fetch(`${API_URL}/livros`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const livros = await response.json();

        livrosTbody.innerHTML = '';
        livros.forEach(livro => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${livro.id}</td>
                <td>${livro.titulo}</td>
                <td>${livro.autor}</td>
                <td>${livro.ano_publicacao || '-'}</td>
                <td>${livro.quantidade_disponivel}</td>
                <td class="actions-btns">
                    <button class="edit-btn" onclick="prepararEdicao(${livro.id}, '${livro.titulo}', '${livro.autor}', ${livro.ano_publicacao}, ${livro.quantidade_disponivel})">Editar</button>
                    <button class="delete-btn" onclick="excluirLivro(${livro.id})">Excluir</button>
                </td>
            `;
            livrosTbody.appendChild(tr);
        });
    } catch (error) {
        showMessage('Erro ao carregar livros.', 'error');
    }
}

livroForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const bodyData = {
        titulo: inputTitulo.value,
        autor: inputAutor.value,
        ano_publicacao: inputAno.value ? parseInt(inputAno.value) : null,
        quantidade_disponivel: parseInt(inputQtd.value)
    };

    const url = id ? `${API_URL}/livros/${id}` : `${API_URL}/livros`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao salvar livro.');

        showMessage(data.message || 'Operação realizada com sucesso!', 'success');
        resetForm();
        carregarLivros();
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

window.prepararEdicao = function(id, titulo, autor, ano, qtd) {
    formTitle.innerText = "Editar Livro";
    inputId.value = id;
    inputTitulo.value = titulo;
    inputAutor.value = autor;
    inputAno.value = ano && ano !== 'null' ? ano : '';
    inputQtd.value = qtd;
    saveBtn.innerText = "Atualizar";
    cancelEditBtn.classList.remove('hidden');
};

cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
    formTitle.innerText = "Cadastrar Novo Livro";
    livroForm.reset();
    inputId.value = '';
    saveBtn.innerText = "Salvar";
    cancelEditBtn.classList.add('hidden');
}

window.excluirLivro = async function(id) {
    if (!confirm('Tem certeza que deseja remover este livro permanentemente?')) return;

    try {
        const response = await fetch(`${API_URL}/livros/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao remover livro.');

        showMessage(data.message, 'success');
        carregarLivros();
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

async function carregarEmprestimos() {
    try {
        const response = await fetch(`${API_URL}/emprestimos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const emprestimos = await response.json();

        emprestimosTbody.innerHTML = '';
        emprestimos.forEach(emp => {
            const dataEmp = new Date(emp.data_emprestimo).toLocaleDateString('pt-BR');
            const dataPrev = new Date(emp.data_devolucao_prevista).toLocaleDateString('pt-BR');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${emp.id}</td>
                <td>${emp.nome_livro}</td>
                <td>${emp.nome_leitor}</td>
                <td>${dataEmp}</td>
                <td>${dataPrev}</td>
                <td>
                    <span class="status-badge status-${emp.status}">${emp.status.toUpperCase()}</span>
                </td>
                <td>
                    ${emp.status === 'ativo' 
                        ? `<button class="approve-btn" onclick="aprovarDevolucao(${emp.id})">Registrar Devolução</button>` 
                        : `-`
                    }
                </td>
            `;
            emprestimosTbody.appendChild(tr);
        });
    } catch (error) {
        showMessage('Erro ao carregar empréstimos.', 'error');
    }
}

window.aprovarDevolucao = async function(id) {
    try {
        const response = await fetch(`${API_URL}/emprestimos/${id}/devolucao`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erro ao processar devolução.');

        showMessage(data.message, 'success');
        carregarEmprestimos();
        carregarLivros(); 
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

carregarLivros();
carregarEmprestimos();
