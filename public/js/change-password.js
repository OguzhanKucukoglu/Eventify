document.addEventListener('DOMContentLoaded', function() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const messageDiv = document.getElementById('message');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            const icon = this.parentElement.querySelector('.input-icon');
            if (icon) {
                icon.style.color = '#3498db';
            }
        });
        
        input.addEventListener('blur', function() {
            const icon = this.parentElement.querySelector('.input-icon');
            if (icon && !this.value) {
                icon.style.color = '#aaa';
            }
        });
    });
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', function() {
            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Şifreler eşleşmiyor');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
        
        if (newPassword) {
            newPassword.addEventListener('input', function() {
                if (confirmPassword.value) {
                    if (newPassword.value !== confirmPassword.value) {
                        confirmPassword.setCustomValidity('Şifreler eşleşmiyor');
                    } else {
                        confirmPassword.setCustomValidity('');
                    }
                }
            });
        }
    }
    
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newPasswordValue = newPassword.value;
            const confirmPasswordValue = confirmPassword.value;
            
            messageDiv.textContent = '';
            messageDiv.className = 'message';
            
            if (!newPasswordValue || !confirmPasswordValue) {
                showMessage('Lütfen tüm alanları doldurun', 'error');
                return;
            }
            
            if (newPasswordValue.length < 8) {
                showMessage('Şifreniz en az 8 karakterli olmalıdır!', 'error');
                return;
            }
            
            if (newPasswordValue !== confirmPasswordValue) {
                showMessage('Şifreler eşleşmiyor', 'error');
                return;
            }
            
            fetch('/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ password: newPasswordValue })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Şifre başarıyla değiştirildi, yönlendiriliyorsunuz...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    if (data.message.includes('ilk kayıtta kullandığınız')) {
                        showMessage('Yeni şifreniz, ilk kayıt olurken kullandığınız şifre ile aynı olamaz. Lütfen farklı bir şifre seçin.', 'error');
                    } else {
                        showMessage(data.message, 'error');
                    }
                }
            })
            .catch(error => {
                console.error('Change password error:', error);
                showMessage('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            });
        });
    }
    
    function showMessage(message, type) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = 'message ' + type;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 4000);
        }
    }
});
