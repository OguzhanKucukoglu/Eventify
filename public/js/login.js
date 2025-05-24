document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    
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
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        messageDiv.textContent = '';
        messageDiv.className = 'message';
        
        if (!email || !password) {
            showMessage('Lütfen tüm alanları doldurun', 'error');
            return;
        }
        
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Giriş başarılı, yönlendiriliyorsunuz...', 'success');
                
                console.log('Login response:', data); 
                if (data.firstLogin) {
                    setTimeout(() => {
                        window.location.href = '/change-password';
                    }, 1000);
                } else if (data.role === 'admin') {
                    console.log('Admin kullanıcısı tespit edildi, admin sayfasına yönlendiriliyor');
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 1000);
                } else {
                    console.log('Normal kullanıcı tespit edildi, dashboard sayfasına yönlendiriliyor');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                }
            } else {
                if (data.message && data.message.includes('onaylanmadı')) {
                    const messageElement = document.getElementById('message');
                    messageElement.innerHTML = `
                        <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="error-title">Hesabınız Henüz Onaylanmadı</div>
                        <div class="error-text">Yönetici onayı bekliyor. Lütfen daha sonra tekrar deneyin veya yönetici ile iletişime geçin.</div>
                    `;
                    messageElement.className = 'message error approval-pending';
                } else {
                    showMessage(data.message, 'error');
                }
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showMessage('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        });
    });
    
    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
    }
});
