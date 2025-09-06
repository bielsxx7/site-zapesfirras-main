document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao tentar fazer login.');
            }

            // Salva o token e o nome do usuário na sessão do navegador
            sessionStorage.setItem('adminAuthToken', data.token);
            sessionStorage.setItem('loggedInUser', data.admin.username);

            // Redireciona para o painel de admin
            window.location.href = 'admin.html';

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
});