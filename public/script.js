
const API_URL = 'http://localhost:3000'; 

const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const feedbackMsg = document.getElementById('feedback-msg');

goToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    clearFeedback();
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
});

goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    clearFeedback();
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

function showFeedback(text, type) {
    feedbackMsg.innerText = text;
    feedbackMsg.className = `message ${type}`;
}

function clearFeedback() {
    feedbackMsg.innerText = '';
    feedbackMsg.className = 'message';
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-senha').value;
    const perfil = document.getElementById('reg-perfil').value;

    try {
        const response = await fetch(`${API_URL}/registrar`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, perfil })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao realizar o cadastro.');
        }

        showFeedback('Cadastro realizado com sucesso! Redirecionando para o login...', 'success');
        document.getElementById('register-form').reset();
        
        setTimeout(() => {
            goToLogin.click();
        }, 2000);

    } catch (error) {
        showFeedback(error.message, 'error');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
        const response = await fetch(`${API_URL}/login`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao realizar o login.');
        }

        if (data.token) localStorage.setItem('token', data.token);
        
        const perfilUsuario = data.usuario.perfil;
        localStorage.setItem('userPerfil', perfilUsuario); 

        showFeedback('Login efetuado com sucesso! Redirecionando...', 'success');

        setTimeout(() => {
            if (perfilUsuario === 'bibliotecario') {
                window.location.href = 'bibliotecario.html';
            } else if (perfilUsuario === 'leitor') {
                window.location.href = 'leitor.html';
            } else {
                showFeedback('Tipo de perfil inválido ou não identificado.', 'error');
            }
        }, 1200);

    } catch (error) {
        showFeedback(error.message, 'error');
    }
});
