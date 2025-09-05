document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os formulários da página
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');

    // Lógica de Login
    if (loginForm) {
        const errorMessageEl = document.getElementById('error-message');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessageEl.textContent = '';
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('http://localhost:3000/api/customers/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, password })
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.message || 'Erro ao fazer login.'); }
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('customerInfo', JSON.stringify(data.customer));
                window.location.href = 'index.html';
            } catch (error) {
                errorMessageEl.textContent = error.message;
            }
        });
    }

    // Lógica de Cadastro (atualizada para incluir o email)
    if (registerForm) {
        const errorMessageEl = document.getElementById('error-message');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessageEl.textContent = '';

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value; // CAMPO NOVO
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password-confirm').value;

            if (password !== passwordConfirm) {
                errorMessageEl.textContent = 'As senhas não coincidem.';
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/customers/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, password }) // ENVIANDO EMAIL
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.message); }
                alert('Cadastro realizado com sucesso! Agora você pode fazer o login.');
                window.location.href = 'login-cliente.html';
            } catch (error) {
                errorMessageEl.textContent = error.message;
            }
        });
    }

    // Nova Lógica para "Esqueci a Senha"
    if (forgotPasswordForm) {
        const messageEl = document.getElementById('message');
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageEl.textContent = 'Enviando...';
            messageEl.style.color = 'var(--text-secondary-light)';

            const email = document.getElementById('email').value;

            try {
                const response = await fetch('http://localhost:3000/api/customers/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.message); }
                messageEl.style.color = 'var(--success-color)';
                messageEl.textContent = data.message;
            } catch (error) {
                messageEl.style.color = 'var(--primary-color)';
                messageEl.textContent = error.message;
            }
        });
    }

    // Nova Lógica para "Resetar a Senha"
    if (resetPasswordForm) {
        const errorMessageEl = document.getElementById('error-message');
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessageEl.textContent = '';

            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password-confirm').value;

            if (password !== passwordConfirm) {
                errorMessageEl.textContent = 'As senhas não coincidem.';
                return;
            }

            // Pega o token da URL
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (!token) {
                errorMessageEl.textContent = 'Token de redefinição não encontrado ou inválido. Por favor, solicite um novo link.';
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/customers/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password })
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.message); }
                alert(data.message);
                window.location.href = 'login-cliente.html';
            } catch (error) {
                errorMessageEl.textContent = error.message;
            }
        });
    }
    
    // --- LÓGICA PARA MOSTRAR/OCULTAR SENHA ---
    const passwordToggles = document.querySelectorAll('.password-toggle-icon');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const inputWrapper = toggle.closest('.input-wrapper');
            const passwordInput = inputWrapper.querySelector('input');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggle.setAttribute('name', 'eye-off-outline');
            } else {
                passwordInput.type = 'password';
                toggle.setAttribute('name', 'eye-outline');
            }
        });
    });

    // --- LÓGICA PARA CONTROLAR MODAIS ---
    const modalTriggers = document.querySelectorAll('.modal-trigger');
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const modalId = trigger.dataset.modalTarget;
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        });
    });

    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    const modalCloseBtns = document.querySelectorAll('.modal-close-btn');
    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.remove('active');
        });
    });
});