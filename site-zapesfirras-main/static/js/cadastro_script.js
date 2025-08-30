document.addEventListener('DOMContentLoaded', () => {
    const formularioCadastro = document.getElementById('formulario-cadastro');

    if (formularioCadastro) {
        formularioCadastro.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nomeCompleto = document.getElementById('nome-completo').value;
            const cpf = document.getElementById('cpf').value;
            const dataNascimento = document.getElementById('data-nascimento').value;
            const email = document.getElementById('email').value;
            const celular = document.getElementById('celular').value;
            const cep = document.getElementById('cep').value;
            const rua = document.getElementById('rua').value;
            const numero = document.getElementById('numero').value;
            const bairro = document.getElementById('bairro').value;
            const cidade = document.getElementById('cidade').value;
            const estado = document.getElementById('estado').value;
            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmar-senha').value;

            // Validação básica
            if (senha !== confirmarSenha) {
                alert('As senhas não coincidem!');
                return;
            }
            
            if (nomeCompleto && cpf && dataNascimento && email && celular && cep && rua && numero && bairro && cidade && estado && senha) {
                alert('Conta criada com sucesso! Redirecionando para a página de login...');
                // Aqui você pode adicionar a lógica para enviar os dados para o servidor e redirecionar
            } else {
                alert('Por favor, preencha todos os campos obrigatórios.');
            }
        });
    }
});