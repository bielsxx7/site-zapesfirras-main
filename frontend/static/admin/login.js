document.addEventListener('DOMContentLoaded', () => {
    // Lista de usuários e senhas autorizados
    const users = {
        'claudio': '123',
        'elaine': '321',
        'caua': '1234'
    };

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o envio real do formulário

        const username = document.getElementById('username').value.toLowerCase(); // Converte para minúsculas
        const password = document.getElementById('password').value;

        // Verifica se o usuário existe e se a senha está correta
        if (users[username] && users[username] === password) {
            // Se as credenciais estiverem corretas:
            errorMessage.textContent = '';
            
            // Salva o nome do usuário na sessão do navegador
            sessionStorage.setItem('loggedInUser', username);

            // Redireciona para o painel de admin
            window.location.href = 'admin.html';
        } else {
            // Se as credenciais estiverem erradas:
            errorMessage.textContent = 'Usuário ou senha inválidos.';
        }
    });
});