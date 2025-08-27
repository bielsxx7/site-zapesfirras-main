document.addEventListener('DOMContentLoaded', () => {
    console.log('Script da página de login carregado.');
    
    const formularioLogin = document.getElementById('formulario-login');

    if (formularioLogin) {
        formularioLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            
            // Lógica de validação básica
            if (email && senha) {
                alert('Login efetuado com sucesso!');
                // Aqui você pode adicionar a lógica para redirecionar o usuário
            } else {
                alert('Por favor, preencha todos os campos.');
            }
        });
    }

    // Lógica para os botões de social login (exemplo)
    document.querySelector('.botao-google').addEventListener('click', () => {
        alert('Login com Google em desenvolvimento!');
    });
    
    document.querySelector('.botao-facebook').addEventListener('click', () => {
        alert('Login com Facebook em desenvolvimento!');
    });
});