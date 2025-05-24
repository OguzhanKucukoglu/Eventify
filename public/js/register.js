document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('message');
    const password = document.getElementById('password');
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
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Şifreler eşleşmiyor');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
        
        if (password) {
            password.addEventListener('input', function() {
                if (confirmPassword.value) {
                    if (password.value !== confirmPassword.value) {
                        confirmPassword.setCustomValidity('Şifreler eşleşmiyor');
                    } else {
                        confirmPassword.setCustomValidity('');
                    }
                }
            });
        }
    }
    
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        messageDiv.textContent = '';
        messageDiv.className = 'message';
        
        if (!email || !password || !confirmPassword) {
            showMessage('Lütfen tüm alanları doldurun', 'error');
            return;
        }
        
        if (password.length < 8) {
            showMessage('Şifre en az 8 karakter uzunluğunda olmalıdır', 'error');
            return;
        }
        
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|mil|co\.\w{2}|io|info|biz|me|tv|mobi|dev|xyz|online|store|tech|app|site|blog|cloud|digital|network|systems|academy|agency|center|company|design|email|group|institute|international|solutions|team|technology|today|world)$/i;
        if (!emailRegex.test(email)) {
            showMessage('Lütfen geçerli bir e-posta adresi girin (örn: ornek@domain.com)', 'error');
            return;
        }
        
        if (email.includes(' ')) {
            showMessage('E-posta adresi boşluk içeremez', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Şifreler eşleşmiyor', 'error');
            return;
        }
        
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success');
                
                fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                }).finally(() => {
                    setTimeout(() => {
                        sessionStorage.clear();
                        localStorage.clear();
                        window.location.href = '/login.html';
                    }, 2000);
                });
            } else {
                showMessage(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Register error:', error);
            showMessage('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        });
    });
    
    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 4000);
    }
});
