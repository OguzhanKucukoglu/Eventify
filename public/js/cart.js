document.addEventListener('DOMContentLoaded', function() {
    const cartItemsContainer = document.getElementById('cartItems');
    const totalPriceElement = document.getElementById('totalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const cartCountElement = document.getElementById('cartCount');
    const orderNumberContainer = document.getElementById('orderNumberContainer');
    const orderNumberDisplay = document.getElementById('orderNumberDisplay');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            
            history.pushState(null, "", "welcome.html");
            history.pushState(null, "", "welcome.html");
            history.pushState(null, "", "welcome.html");
            
            window.location.replace('welcome.html');
        });
    }
    
    let cart = [];
    let currentUser = null;
    let currentOrderNumber = null;

    function clearCart() {
        cart = [];
        if (currentUser) {
            const cartKey = `cart_${currentUser.email}`;
            localStorage.removeItem(cartKey);
        }
        updateCartCount();
        console.log('Sepet temizlendi');
    }
    
    function generateOrderNumber() {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 10000);
        return `EVT-${timestamp}-${random}`;
    }
    
    function showOrderNumber() {
        currentOrderNumber = generateOrderNumber();
        if (orderNumberContainer && orderNumberDisplay) {
            orderNumberContainer.style.display = 'flex';
            orderNumberDisplay.textContent = currentOrderNumber;
        }
        return currentOrderNumber;
    }
    
    fetch('/api/user')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                console.log('Kullanıcı bilgileri yüklendi:', currentUser.email);
                
                const cartKey = `cart_${currentUser.email}`;
                cart = JSON.parse(localStorage.getItem(cartKey)) || [];
                
                loadCartItems();
                
                updateCartCount();
                
                showOrderNumber();
            }
        })
        .catch(error => {
            console.error('Get user error:', error);
        });
    
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const creditCardForm = document.getElementById('creditCardForm');
    const bankTransferInfo = document.getElementById('bankTransferInfo');
    const payAtDoorInfo = document.getElementById('payAtDoorInfo');
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryDateInput = document.getElementById('expiryDate');
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s+/g, '');
            value = value.replace(/\D/g, '');
            if (value.length > 0) {
                value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
            }
            if (value.length > 19) {
                value = value.substr(0, 19);
            }
            e.target.value = value;
        });
    }
    
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            
            if (value.length > 5) {
                value = value.substr(0, 5);
            }
            
            if (value.length >= 2) {
                const month = parseInt(value.substring(0, 2));
                if (month < 1) {
                    value = '01' + value.substring(2);
                } else if (month > 12) {
                    value = '12' + value.substring(2);
                }
            }
            
            e.target.value = value;
        });
    }
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            creditCardForm.classList.remove('active');
            bankTransferInfo.classList.remove('active');
            payAtDoorInfo.classList.remove('active');
            
            if (this.value === 'creditCard') {
                creditCardForm.classList.add('active');
            } else if (this.value === 'bankTransfer') {
                bankTransferInfo.classList.add('active');
            } else if (this.value === 'payAtDoor') {
                payAtDoorInfo.classList.add('active');
            }
        });
    });
    
    creditCardForm.classList.remove('active');
    bankTransferInfo.classList.remove('active');
    payAtDoorInfo.classList.remove('active');
    
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (selectedPaymentMethod) {
        if (selectedPaymentMethod.value === 'creditCard') {
            creditCardForm.classList.add('active');
            bankTransferInfo.classList.remove('active');
            payAtDoorInfo.classList.remove('active');
        } else if (selectedPaymentMethod.value === 'bankTransfer') {
            creditCardForm.classList.remove('active');
            bankTransferInfo.classList.add('active');
            payAtDoorInfo.classList.remove('active');
        } else if (selectedPaymentMethod.value === 'payAtDoor') {
            creditCardForm.classList.remove('active');
            bankTransferInfo.classList.remove('active');
            payAtDoorInfo.classList.add('active');
        }
    }
    
    checkoutBtn.addEventListener('click', checkout);
    logoutBtn.addEventListener('click', logout);
    
    function loadCartItems() {
        const emptyCartMessage = document.getElementById('emptyCartMessage');
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
            totalPriceElement.textContent = '0.00 ₺';
            checkoutBtn.disabled = true;
            
            if (emptyCartMessage) {
                emptyCartMessage.style.display = 'block';
            }
            return;
        }
        
        if (emptyCartMessage) {
            emptyCartMessage.style.display = 'none';
        }
        
        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            totalPrice += itemTotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image || 'https://via.placeholder.com/80x80?text=Etkinlik'}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${item.title}</h3>
                    <div class="cart-item-details">
                        <p>${item.date} - ${item.time}</p>
                        <p>${item.location}</p>
                        <p>${item.type}</p>
                    </div>
                    <div class="cart-item-price">${item.price.toFixed(2)} ₺</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn decrease-btn" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-index="${index}">
                    <button class="quantity-btn increase-btn" data-index="${index}">+</button>
                    <button class="remove-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            cartItemsContainer.appendChild(cartItem);
        });
        
        totalPriceElement.textContent = totalPrice.toFixed(2) + ' ₺';
        
        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                if (cart[index].quantity > 1) {
                    cart[index].quantity--;
                    updateCart();
                }
            });
        });
        
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                cart[index].quantity++;
                updateCart();
            });
        });
        
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const quantity = parseInt(this.value);
                
                if (quantity < 1) {
                    this.value = 1;
                    cart[index].quantity = 1;
                } else {
                    cart[index].quantity = quantity;
                }
                
                updateCart();
            });
        });
        
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                cart.splice(index, 1);
                updateCart();
            });
        });
    }
    
    function updateCart() {
        if (currentUser) {
            const cartKey = `cart_${currentUser.email}`;
            localStorage.setItem(cartKey, JSON.stringify(cart));
            loadCartItems();
            updateCartCount();
        }
    }
    
    function updateCartCount() {
        if (cartCountElement && currentUser) {
            const cartKey = `cart_${currentUser.email}`;
            const userCart = JSON.parse(localStorage.getItem(cartKey)) || [];
            const count = userCart.length;
            
            cartCountElement.textContent = count;
            
            if (count === 0) {
                cartCountElement.style.display = 'none';
            } else {
                cartCountElement.style.display = 'flex';
            }
        }
    }
    
    function checkout() {
        if (cart.length === 0) {
            document.getElementById('emptyCartMessage').style.display = 'block';
            setTimeout(() => {
                document.getElementById('emptyCartMessage').style.display = 'none';
            }, 3000);
            return;
        }
        

        const orderNumber = currentOrderNumber;
        
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        if (paymentMethod === 'creditCard') {
            const cardName = document.getElementById('cardName').value;
            const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
            const expiryDate = document.getElementById('expiryDate').value;
            const cvv = document.getElementById('cvv').value;
            
            if (!cardName || !cardNumber || !expiryDate || !cvv) {
                showPaymentAlert('Lütfen tüm kart bilgilerini doldurun.');
                return;
            }
            
            if (!/^\d{16}$/.test(cardNumber)) {
                showPaymentAlert('Geçersiz kart numarası. 16 haneli bir numara girin.');
                return;
            }
            
            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
                showPaymentAlert('Geçersiz son kullanma tarihi. AA/YY formatında girin.');
                return;
            }
            
            if (!/^\d{3}$/.test(cvv)) {
                showPaymentAlert('Geçersiz CVV. 3 haneli bir numara girin.');
                return;
            }
        }
        
        if (cart.length > 0) {
            const cartItems = cart.map(item => ({
                eventId: item.eventId,
                quantity: item.quantity
            }));
            
            const requestData = {
                cartItems: cartItems,
                paymentMethod: paymentMethod,
                orderNumber: orderNumber 
            };
            
            console.log('Gönderilen veri:', requestData);
            
            fetch('/api/purchase-tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                console.log('Sunucu yanıt durumu:', response.status);
                return response.text().then(text => {
                    try {
                        return text ? JSON.parse(text) : {};
                    } catch (e) {
                        console.error('JSON ayrıştırma hatası:', e);
                        console.log('Sunucu yanıtı (metin):', text);
                        return { success: false, message: 'Sunucu yanıtı ayrıştırılamadı.' };
                    }
                });
            })
            .then(data => {
                console.log('Sunucu yanıtı:', data);
                if (data.success) {
                    clearCart();
                    
                    const successModal = document.getElementById('successModal');
                    const modalOkButton = document.getElementById('modalOkButton');
                    const closeModal = document.querySelector('.close-modal');
                    
                    const modalContent = successModal.querySelector('.modal-content');
                    const modalTitle = modalContent.querySelector('h2');
                    const modalText = modalContent.querySelector('p');
                    
                    modalTitle.textContent = 'Satın alma işlemi başarılı!';
                    modalText.innerHTML = `Siparişiniz başarıyla tamamlandı.<br><br>
                                        <strong>Sipariş Numarası:</strong> ${currentOrderNumber}<br>
                                        <strong>Toplam Tutar:</strong> ${totalPriceElement.textContent}`;
                    
                    successModal.style.display = 'block';
                    
                    modalOkButton.onclick = function() {
                        successModal.style.display = 'none';
                        window.location.href = '/dashboard';
                    }
                    
                    closeModal.onclick = function() {
                        successModal.style.display = 'none';
                        window.location.href = '/dashboard';
                    }
                    
                    window.onclick = function(event) {
                        if (event.target == successModal) {
                            successModal.style.display = 'none';
                            window.location.href = '/dashboard';
                        }
                    }
                } else {
                    showPaymentAlert(`Hata: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Checkout error:', error);
                showPaymentAlert('Bir hata oluştu. Lütfen tekrar deneyin.');
            });
        }
    }
    
    function showPaymentAlert(message) {
        const paymentAlert = document.getElementById('paymentAlert');
        const alertMessage = document.getElementById('alertMessage');
        
        alertMessage.textContent = message;
        paymentAlert.style.display = 'flex';
        
        setTimeout(() => {
            paymentAlert.style.display = 'none';
        }, 5000);
    }
});