document.addEventListener('DOMContentLoaded', function() {
    const interestsForm = document.getElementById('interestsForm');
    const weatherInfo = document.getElementById('weatherInfo');
    const recommendedEvents = document.getElementById('recommendedEvents');
    const announcements = document.getElementById('announcements');
    const events = document.getElementById('events');
    const eventTypeFilter = document.getElementById('eventTypeFilter');
    const logoutBtn = document.getElementById('logoutBtn');
    const citySelect = document.getElementById('citySelect');
    const cartCountElement = document.getElementById('cartCount');
    
    let currentUser = null;
    let cart = [];
    
    fetch('/api/user')
        .then(response => response.json())
        .then(async data => {
            if (data.success) {
                currentUser = data.user;
                
                const cartKey = `cart_${currentUser.email}`;
                cart = JSON.parse(localStorage.getItem(cartKey)) || [];
                
                updateCartCount();
                
                const adminPanelItem = document.getElementById('adminPanelItem');
                if (adminPanelItem && currentUser.role === 'admin') {
                    adminPanelItem.style.display = 'block';
                }
                
                if (currentUser.interests) {
                    const checkboxes = document.querySelectorAll('input[name="interests"]');
                    checkboxes.forEach(checkbox => {
                        if (currentUser.interests.includes(checkbox.value)) {
                            checkbox.checked = true;
                        }
                    });
                }
                
                const defaultCity = currentUser.city || 'Istanbul';
                citySelect.value = defaultCity;
                
                if (!currentUser.city) {
                    await updateUserCity(defaultCity);
                }
                
                getWeather();
                
                loadRecommendedEvents();
                
                console.log('Kullanıcı bilgileri yüklendi:', currentUser);
            }
        })
        .catch(error => {
            console.error('Get user error:', error);
        });
    
    updateCartCount();
    
    loadEvents();
    loadAnnouncements();
    
    interestsForm.addEventListener('submit', updateInterests);
    citySelect.addEventListener('change', function() {
        getWeather();
        loadEvents();
        loadRecommendedEvents();
    });
    eventTypeFilter.addEventListener('change', filterEvents);
    logoutBtn.addEventListener('click', logout);
    
    function updateInterests(e) {
        e.preventDefault();
        
        const checkboxes = document.querySelectorAll('input[name="interests"]:checked');
        const interests = Array.from(checkboxes).map(checkbox => checkbox.value);
        
        fetch('/api/update-interests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ interests })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadRecommendedEvents();
            } else {
                console.error('İlgi alanları güncellenirken bir hata oluştu:', data.message);
            }
        })
        .catch(error => {
            console.error('Update interests error:', error);
            alert('Bir hata oluştu. Lütfen tekrar deneyin.');
        });
    }
    
    function getWeather() {
        const city = citySelect.value;
        
        if (!city) {
            return;
        }
        
        updateUserCity(city);
        
        weatherInfo.innerHTML = '<p>Hava durumu bilgisi yükleniyor...</p>';
        
        fetch(`/api/weather/${city}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const weather = data.weather;
                    const suitableClass = weather.suitable ? 'suitable-yes' : 'suitable-no';
                    const suitableText = weather.suitable ? 
                        'Hava durumu etkinlikler için uygun.' : 
                        'Hava durumu etkinlikler için uygun değil.';
                    
                    weatherInfo.innerHTML = `
                        <div class="weather-details">
                            <img src="https://openweathermap.org/img/w/${weather.icon}.png" alt="Weather Icon" class="weather-icon">
                            <div>
                                <h3>${weather.city}</h3>
                                <p>${weather.temperature}°C - ${weather.description}</p>
                            </div>
                        </div>
                        <div class="weather-suitable ${suitableClass}">
                            <p>${suitableText}</p>
                        </div>
                    `;
                } else {
                    weatherInfo.innerHTML = `<p>Hava durumu bilgisi alınamadı: ${data.message}</p>`;
                }
            })
            .catch(error => {
                console.error('Weather error:', error);
                weatherInfo.innerHTML = '<p>Hava durumu bilgisi alınırken bir hata oluştu.</p>';
            });
    }
    
    function loadRecommendedEvents() {
        recommendedEvents.innerHTML = '<p class="loading">Öneriler yükleniyor...</p>';
        
        fetch('/api/recommended-events')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.events.length === 0) {
                        recommendedEvents.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Size özel etkinlik önerilerini görmek için ilgi alanlarınızı seçin.</p>';
                        return;
                    }
                    
                    recommendedEvents.innerHTML = '';
                    
                    const selectedCity = citySelect.value;
                    const filteredEvents = data.events.filter(event => {
                        const eventCity = event.location.split(',').pop().trim();
                        return eventCity === selectedCity;
                    });
                    
                    if (filteredEvents.length === 0) {
                        recommendedEvents.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Seçili şehirde size özel etkinlik önerisi bulunmamaktadır.</p>';
                        return;
                    }
                    
                    filteredEvents.forEach(event => {
                        recommendedEvents.appendChild(createEventCard(event));
                    });
                } else {
                    recommendedEvents.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Öneriler yüklenirken bir hata oluştu.</p>';
                }
            })
            .catch(error => {
                console.error('Recommended events error:', error);
                recommendedEvents.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Öneriler yüklenirken bir hata oluştu.</p>';
            });
    }
    
    function loadEvents() {
        events.innerHTML = '<p class="loading">Etkinlikler yükleniyor...</p>';
        
        fetch('/api/events')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.events.length === 0) {
                        events.innerHTML = '<p>Etkinlik bulunamadı.</p>';
                        return;
                    }
                    
                    window.allEvents = data.events;
                    
                    const selectedCity = citySelect.value;
                    const filteredEvents = data.events.filter(event => {
                        const eventCity = event.location.split(',').pop().trim();
                        return eventCity === selectedCity;
                    });
                    
                    displayEvents(filteredEvents);
                } else {
                    events.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Etkinlikler yüklenirken bir hata oluştu.</p>';
                }
            })
            .catch(error => {
                console.error('Events error:', error);
                events.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Etkinlikler yüklenirken bir hata oluştu.</p>';
            });
    }
    
    function displayEvents(eventsList) {
        events.innerHTML = '';
        
        if (eventsList.length === 0) {
            events.innerHTML = '<p style="font-size: 16px; background-color: rgba(0, 0, 0, 0.55); border-radius: 4px;">Seçilen kriterlere uygun etkinlik bulunamadı.</p>';
            return;
        }
        
        eventsList.forEach(event => {
            events.appendChild(createEventCard(event));
        });
    }
    
    function filterEvents() {
        const selectedType = eventTypeFilter.value;
        const selectedCity = citySelect.value;
        let filteredEvents = window.allEvents;

        if (selectedType !== 'all') {
            filteredEvents = filteredEvents.filter(event => event.type === selectedType);
        }

        filteredEvents = filteredEvents.filter(event => {
            const eventCity = event.location.split(',').pop().trim();
            return eventCity === selectedCity;
        });

        displayEvents(filteredEvents);
    }
    
    function createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        
        const isInCart = cart.some(item => item.eventId === event.id);
        
        const eventDate = new Date(event.date);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleString('tr-TR', { month: 'short' });
        
        card.innerHTML = `
            <div class="event-image">
                <img src="${event.image || 'https://via.placeholder.com/300x180?text=Etkinlik'}" alt="${event.title}">
                <div class="event-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
            </div>
            <div class="event-details">
                <h3 class="event-title">${event.title}</h3>
                <p class="event-info"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                <p class="event-info"><i class="fas fa-clock"></i> ${event.time}</p>
                <p class="event-info"><i class="fas fa-tag"></i> ${event.type}</p>
                <p class="event-info"><i class="fas fa-users"></i> Kalan: ${event.remainingCapacity}/${event.capacity}</p>
                <div class="event-footer">
                    <p class="event-price"> ${event.price.toFixed(2)} ₺</p>
                    <button class="btn ${isInCart ? 'secondary-btn' : 'primary-btn'} add-to-cart-btn" data-event-id="${event.id}">
                        <i class="fas fa-shopping-cart"></i>
                        ${isInCart ? 'Sepette' : 'Sepete Ekle'}
                    </button>
                </div>
            </div>
        `;
        
        const addToCartBtn = card.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', function() {
            const eventId = this.getAttribute('data-event-id');
            
            const existingItemIndex = cart.findIndex(item => item.eventId === eventId);
            
            if (existingItemIndex !== -1) {
                return;
            }
            
            const eventToAdd = window.allEvents.find(e => e.id === eventId);
            
            if (eventToAdd) {
                cart.push({
                    eventId: eventToAdd.id,
                    title: eventToAdd.title,
                    date: eventToAdd.date,
                    time: eventToAdd.time,
                    location: eventToAdd.location,
                    type: eventToAdd.type,
                    price: eventToAdd.price,
                    image: eventToAdd.image,
                    quantity: 1
                });
                
                const cartKey = `cart_${currentUser.email}`;
                localStorage.setItem(cartKey, JSON.stringify(cart));
                
                this.innerHTML = '<i class="fas fa-shopping-cart"></i> Sepette';
                this.classList.remove('primary-btn');
                this.classList.add('secondary-btn');
                
                updateCartCount();
            }
        });
        
        return card;
    }
    
    function loadAnnouncements() {
        announcements.innerHTML = '<p class="loading">Duyurular yükleniyor...</p>';
        
        fetch('/api/announcements')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.announcements.length === 0) {
                        announcements.innerHTML = '<p>Duyuru bulunamadı.</p>';
                        return;
                    }
                    
                    console.log('Gelen duyurular:', data.announcements);
                    
                    const sortedAnnouncements = data.announcements.sort((a, b) => {
                        const dateB = new Date(b.date).getTime();
                        const dateA = new Date(a.date).getTime();
                        return dateB - dateA;
                    });
                    
                    announcements.innerHTML = '';
                    
                    sortedAnnouncements.forEach(announcement => {
                        const card = document.createElement('div');
                        card.className = 'announcement-card';
                        
                        let formattedDate = 'Tarih bilgisi yok';
                        if (announcement.date) {
                            try {
                                const date = new Date(announcement.date);
                                
                                if (!isNaN(date.getTime())) {
                                    formattedDate = new Intl.DateTimeFormat('tr-TR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }).format(date);
                                }
                            } catch (error) {
                                console.error('Tarih dönüştürme hatası:', error, announcement.date);
                            }
                        }
                        
                        card.innerHTML = `
                            <h3 class="announcement-title">${announcement.title}</h3>
                            <p class="announcement-date">${formattedDate}</p>
                            <p class="announcement-content">${announcement.content}</p>
                        `;
                        
                        announcements.appendChild(card);
                    });
                } else {
                    announcements.innerHTML = '<p>Duyurular yüklenirken bir hata oluştu.</p>';
                }
            })
            .catch(error => {
                console.error('Announcements error:', error);
                announcements.innerHTML = '<p>Duyurular yüklenirken bir hata oluştu.</p>';
            });
    }
    
    function updateUserCity(city) {
        fetch('/api/update-city', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Şehir bilgisi güncellendi:', city);
                if (currentUser) {
                    currentUser.city = city;
                }
            } else {
                console.error('Şehir bilgisi güncellenirken bir hata oluştu:', data.message);
            }
        })
        .catch(error => {
            console.error('Update city error:', error);
        });
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
    
    function logout() {
        fetch('/api/logout')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    sessionStorage.clear();
                    localStorage.clear();
                    
                    document.cookie.split(";").forEach(function(c) { 
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });

                    if (window.caches) {
                        caches.keys().then(names => {
                            names.forEach(name => {
                                caches.delete(name);
                            });
                        });
                    }

                    window.location.replace('/welcome.html');
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
                sessionStorage.clear();
                localStorage.clear();
                document.cookie.split(";").forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.replace('/welcome.html');
            });
    }
});
