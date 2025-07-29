document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageElement = document.getElementById('resetMessage');
    const resetBtn = document.getElementById('resetBtn');
    const loginLinkContainer = document.getElementById('loginLinkContainer');

    // Pega o código de ação da URL
    const params = new URLSearchParams(window.location.search);
    const actionCode = params.get('oobCode');

    if (!actionCode) {
        messageElement.textContent = 'Link de redefinição inválido ou ausente.';
        messageElement.className = 'message error';
        resetForm.style.display = 'none';
        return;
    }

    // Verifica se o código é válido
    firebase.auth().verifyPasswordResetCode(actionCode).then(email => {
        messageElement.textContent = `Redefinindo a senha para ${email}. Insira sua nova senha.`;
        messageElement.className = 'message info';
    }).catch(error => {
        messageElement.textContent = 'O link de redefinição é inválido ou expirou. Por favor, solicite um novo.';
        messageElement.className = 'message error';
        resetForm.style.display = 'none';
    });

    resetForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword.length < 6) {
            messageElement.textContent = 'A senha deve ter pelo menos 6 caracteres.';
            messageElement.className = 'message error';
            return;
        }

        if (newPassword !== confirmPassword) {
            messageElement.textContent = 'As senhas não coincidem. Tente novamente.';
            messageElement.className = 'message error';
            return;
        }

        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Salva a nova senha
        firebase.auth().confirmPasswordReset(actionCode, newPassword).then(() => {
            messageElement.textContent = 'Sua senha foi redefinida com sucesso!';
            messageElement.className = 'message success';
            resetForm.style.display = 'none';
            loginLinkContainer.style.display = 'block';
        }).catch(error => {
            messageElement.textContent = 'Ocorreu um erro ao redefinir a senha. O link pode ter expirado.';
            messageElement.className = 'message error';
            resetBtn.disabled = false;
            resetBtn.textContent = 'Salvar Nova Senha';
        });
    });
});