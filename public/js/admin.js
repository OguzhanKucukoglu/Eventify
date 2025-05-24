let currentUsers = [];
let currentEvents = [];
let currentAnnouncements = [];

const API_ENDPOINTS = {
    USERS: '/api/admin/users',
    EVENTS: '/api/admin/events',
    ANNOUNCEMENTS: '/api/admin/announcements',
    LOGOUT: '/api/auth/logout',
    APPROVE_USER: '/api/admin/approve-user',
    TOGGLE_BLOCK: '/api/admin/toggle-block-user',
    MAKE_ADMIN: '/api/admin/make-admin',
    DELETE_USER: '/api/admin/delete-user',
    DELETE_EVENT: '/api/admin/delete-event',
    DELETE_ANNOUNCEMENT: '/api/admin/delete-announcement',
    ADD_EVENT: '/api/admin/add-event',
    UPDATE_EVENT: '/api/admin/update-event',
    ADD_ANNOUNCEMENT: '/api/admin/add-announcement',
    UPDATE_ANNOUNCEMENT: '/api/admin/update-announcement'
};

function logout() {
    fetch(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(() => {
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

function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';
    if (type === 'warning') icon = 'exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <div class="notification-close">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    container.appendChild(notification);
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const usersTableBody = document.getElementById('usersTableBody');
    const eventsTableBody = document.getElementById('eventsTableBody');
    const announcementsTableBody = document.getElementById('announcementsTableBody');
    const addEventBtn = document.getElementById('addEventBtn');
    const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
    const eventModal = document.getElementById('eventModal');
    const announcementModal = document.getElementById('announcementModal');
    const eventForm = document.getElementById('eventForm');
    const announcementForm = document.getElementById('announcementForm');
    const eventModalTitle = document.getElementById('eventModalTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const userSearch = document.getElementById('userSearch');
    const eventSearch = document.getElementById('eventSearch');
    const announcementSearch = document.getElementById('announcementSearch');
    
    if (userSearch) {
        userSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#usersTableBody tr');
            
            rows.forEach(row => {
                const email = row.querySelector('td:first-child')?.textContent.toLowerCase();
                if (email && email.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    if (eventSearch) {
        eventSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#eventsTableBody tr');
            
            rows.forEach(row => {
                const title = row.querySelector('td:first-child')?.textContent.toLowerCase();
                if (title && title.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    if (announcementSearch) {
        announcementSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#announcementsTableBody tr');
            
            rows.forEach(row => {
                const title = row.querySelector('td:first-child')?.textContent.toLowerCase();
                if (title && title.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    loadUsers();
    loadEvents();
    loadAnnouncements();
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    document.querySelectorAll('.close, .close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            eventModal.style.display = 'none';
            announcementModal.style.display = 'none';
        });
    });
    
    addEventBtn.addEventListener('click', function() {
        eventForm.reset();
        document.getElementById('eventId').value = '';
        eventModalTitle.textContent = 'Etkinlik Ekle';
        
        eventModal.style.display = 'block';
    });
    
    addAnnouncementBtn.addEventListener('click', function() {
        announcementForm.reset();
        document.getElementById('announcementId').value = '';
        document.getElementById('announcementModalTitle').textContent = 'Duyuru Ekle';
        
        announcementModal.style.display = 'block';
    });
    
    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const eventId = document.getElementById('eventId').value;
        const title = document.getElementById('eventTitle').value;
        const description = document.getElementById('eventDescription').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const location = document.getElementById('eventLocation').value;
        const type = document.getElementById('eventType').value;
        const capacity = document.getElementById('eventCapacity').value;
        const price = document.getElementById('eventPrice').value;
        const image = document.getElementById('eventImage').value;
        
        const eventData = {
            title,
            description,
            date,
            time,
            location,
            type,
            capacity: parseInt(capacity),
            price: parseFloat(price),
            image
        };
        
        if (eventId) {
            updateEvent(eventId, eventData);
        } else {
            addEvent(eventData);
        }
    });
    
    announcementForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const announcementId = document.getElementById('announcementId').value;
        const title = document.getElementById('announcementTitle').value;
        const content = document.getElementById('announcementContent').value;
        
        const announcementData = { title, content };
        
        if (announcementId) {
            updateAnnouncement(announcementId, announcementData);
        } else {
            addAnnouncement(announcementData);
        }
    });
    
    logoutBtn.addEventListener('click', logout);
    
    function loadUsers() {
        usersTableBody.innerHTML = '<tr class="loading-row"><td colspan="5"><div class="loading-text">Kullanıcılar yükleniyor...</div></td></tr>';
        
        fetch(API_ENDPOINTS.USERS, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    currentUsers = data.users || [];
                    
                    if (currentUsers.length === 0) {
                        usersTableBody.innerHTML = '<tr class="no-data"><td colspan="5">Kullanıcı bulunamadı.</td></tr>';
                        return;
                    }
                    
                    usersTableBody.innerHTML = '';
                    
                    currentUsers.forEach(user => {
                        const row = document.createElement('tr');
                        const isCurrentUser = user.email === document.querySelector('#logoutBtn').getAttribute('data-email');
                        const isBlocked = user.blocked || false;
                        
                        row.innerHTML = `
                            <td>${user.email}</td>
                            <td>${user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</td>
                            <td>${user.approved ? 'Onaylandı' : 'Beklemede'}</td>
                            <td>${isBlocked ? '<span class="status-blocked">Engellendi</span>' : '<span class="status-active">Aktif</span>'}</td>
                            <td class="action-buttons">
                                ${!user.approved ? 
                                    `<button class="action-btn approve-btn" data-email="${user.email}">Onayla</button>` : 
                                    ''}
                                
                                ${!isCurrentUser ? `
                                    <button class="action-btn ${isBlocked ? 'unblock-btn' : 'block-btn'}" data-email="${user.email}" data-blocked="${isBlocked}">
                                        ${isBlocked ? 'Engeli Kaldır' : 'Engelle'}
                                    </button>
                                    
                                    <button class="action-btn ${user.role === 'admin' ? 'remove-admin-btn' : 'make-admin-btn'}" data-email="${user.email}" data-role="${user.role}">
                                        ${user.role === 'admin' ? 'Yöneticiyi Kaldır' : 'Yönetici Yap'}
                                    </button>
                                    
                                    <button class="action-btn delete-btn" data-email="${user.email}">
                                        Sil
                                    </button>
                                ` : '<span class="current-user-note">Aktif Kullanıcı</span>'}
                            </td>
                        `;
                        
                        usersTableBody.appendChild(row);
                    });
                    
                    document.querySelectorAll('.approve-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const email = this.getAttribute('data-email');
                            approveUser(email);
                        });
                    });
                    
                    document.querySelectorAll('.block-btn, .unblock-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const email = this.getAttribute('data-email');
                            const isBlocked = this.getAttribute('data-blocked') === 'true';
                            toggleBlockUser(email, !isBlocked);
                        });
                    });
                    
                    document.querySelectorAll('.make-admin-btn, .remove-admin-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const email = this.getAttribute('data-email');
                            const role = this.getAttribute('data-role');
                            toggleAdminRole(email, role !== 'admin');
                        });
                    });
                    
                    document.querySelectorAll('.delete-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const email = this.getAttribute('data-email');
                            deleteUser(email);
                        });
                    });
                } else {
                    usersTableBody.innerHTML = '<tr class="error-row"><td colspan="5">Kullanıcılar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</td></tr>';
                }
            })
            .catch(error => {
                console.error('Load users error:', error);
                usersTableBody.innerHTML = `<tr class="error-row"><td colspan="5">Kullanıcılar yüklenirken bir hata oluştu: ${error.message}</td></tr>`;
            });
    }
    
    function loadEvents() {
        if (!eventsTableBody) return;
        
        eventsTableBody.innerHTML = '<tr class="loading-row"><td colspan="8"><div class="loading-text">Etkinlikler yükleniyor...</div></td></tr>';
        
        fetch(API_ENDPOINTS.EVENTS, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    currentEvents = data.events || [];
                    
                    if (currentEvents.length === 0) {
                        eventsTableBody.innerHTML = '<tr class="no-data"><td colspan="8">Etkinlik bulunamadı.</td></tr>';
                        return;
                    }
                    
                    eventsTableBody.innerHTML = '';
                    
                    currentEvents.forEach(event => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${event.title}</td>
                            <td>${event.date}</td>
                            <td>${event.time}</td>
                            <td>${event.location}</td>
                            <td>${event.type}</td>
                            <td>${event.capacity}</td>
                            <td>${event.price} TL</td>
                            <td class="action-buttons">
                                <button class="action-btn edit-btn" data-id="${event.id}">Düzenle</button>
                                <button class="action-btn delete-btn" data-id="${event.id}">Sil</button>
                            </td>
                        `;
                        
                        eventsTableBody.appendChild(row);
                    });
                    
                    document.querySelectorAll('#eventsTableBody .edit-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const eventId = this.getAttribute('data-id');
                            const event = currentEvents.find(e => e.id === eventId);
                            
                            if (event) {
                                document.getElementById('eventId').value = event.id;
                                document.getElementById('eventTitle').value = event.title;
                                document.getElementById('eventDescription').value = event.description;
                                document.getElementById('eventDate').value = event.date;
                                document.getElementById('eventTime').value = event.time;
                                document.getElementById('eventLocation').value = event.location;
                                document.getElementById('eventType').value = event.type;
                                document.getElementById('eventCapacity').value = event.capacity;
                                document.getElementById('eventPrice').value = event.price;
                                document.getElementById('eventImage').value = event.image;
                                
                                eventModalTitle.textContent = 'Etkinlik Düzenle';
                                
                                eventModal.style.display = 'block';
                            }
                        });
                    });
                    
                    document.querySelectorAll('#eventsTableBody .delete-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const eventId = this.getAttribute('data-id');
                            if (confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) {
                                deleteEvent(eventId);
                            }
                        });
                    });
                } else {
                    eventsTableBody.innerHTML = '<tr class="error-row"><td colspan="8">Etkinlikler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</td></tr>';
                }
            })
            .catch(error => {
                console.error('Load events error:', error);
                eventsTableBody.innerHTML = `<tr class="error-row"><td colspan="8">Etkinlikler yüklenirken bir hata oluştu: ${error.message}</td></tr>`;
            });
    }
    
    function loadAnnouncements() {
        if (!announcementsTableBody) return;
        
        announcementsTableBody.innerHTML = '<tr class="loading-row"><td colspan="3"><div class="loading-text">Duyurular yükleniyor...</div></td></tr>';
        
        fetch(API_ENDPOINTS.ANNOUNCEMENTS, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    currentAnnouncements = data.announcements || [];
                    
                    if (currentAnnouncements.length === 0) {
                        announcementsTableBody.innerHTML = '<tr class="no-data"><td colspan="3">Duyuru bulunamadı.</td></tr>';
                        return;
                    }
                    
                    announcementsTableBody.innerHTML = '';
                    
                    currentAnnouncements.forEach(announcement => {
                        const row = document.createElement('tr');
                        
                        let formattedDate = 'Tarih bilgisi yok';
                        if (announcement.createdAt) {
                            try {
                                const dateStr = announcement.createdAt.replace('T', ' ').split('.')[0];
                                const date = new Date(dateStr);
                                
                                if (!isNaN(date.getTime())) {
                                    formattedDate = new Intl.DateTimeFormat('tr-TR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }).format(date);
                                }
                            } catch (error) {
                                console.error('Tarih dönüştürme hatası:', error, announcement.createdAt);
                            }
                        }
                        
                        row.innerHTML = `
                            <td>${announcement.title}</td>
                            <td>${announcement.content}</td>
                            <td>${formattedDate}</td>
                            <td class="action-buttons">
                                <button class="action-btn edit-btn" data-id="${announcement.id}">Düzenle</button>
                                <button class="action-btn delete-btn" data-id="${announcement.id}">Sil</button>
                            </td>
                        `;
                        
                        announcementsTableBody.appendChild(row);
                    });
                    
                    document.querySelectorAll('#announcementsTableBody .edit-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const announcementId = this.getAttribute('data-id');
                            const announcement = currentAnnouncements.find(a => a.id === parseInt(announcementId));
                            
                            if (announcement) {
                                document.getElementById('announcementId').value = announcement.id;
                                document.getElementById('announcementTitle').value = announcement.title;
                                document.getElementById('announcementContent').value = announcement.content;
                                
                                document.getElementById('announcementModalTitle').textContent = 'Duyuru Düzenle';
                                
                                announcementModal.style.display = 'block';
                            }
                        });
                    });
                    
                    document.querySelectorAll('#announcementsTableBody .delete-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const announcementId = this.getAttribute('data-id');
                            if (confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) {
                                deleteAnnouncement(announcementId);
                            }
                        });
                    });
                } else {
                    announcementsTableBody.innerHTML = '<tr class="error-row"><td colspan="3">Duyurular yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</td></tr>';
                }
            })
            .catch(error => {
                console.error('Load announcements error:', error);
                announcementsTableBody.innerHTML = `<tr class="error-row"><td colspan="3">Duyurular yüklenirken bir hata oluştu: ${error.message}</td></tr>`;
            });
    }
    
    function toggleBlockUser(email, blocked) {
        if (!email) {
            console.error('Email parametresi eksik');
            return;
        }
        
        const action = blocked ? 'engellemek' : 'engelini kaldırmak';
        if (!confirm(`${email} kullanıcısını ${action} istediğinizden emin misiniz?`)) {
            return;
        }
        
        console.log('Kullanıcı engelleme/engel kaldırma işlemi başlatılıyor:', { email, blocked });
        
        fetch(API_ENDPOINTS.TOGGLE_BLOCK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, blocked })
        })
        .then(response => {
            console.log('Sunucu yanıt durumu:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Sunucu yanıt içeriği:', text);
                    throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Sunucu yanıtı:', data);
            if (data.success) {
                showNotification('Başarılı', blocked ? 'Kullanıcı engellendi.' : 'Kullanıcının engeli kaldırıldı.', 'success');
                loadUsers();
            } else {
                showNotification('Hata', data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Toggle block user error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }
    
    function toggleAdminRole(email, makeAdmin) {
        if (!email) {
            console.error('Email parametresi eksik');
            return;
        }
        
        const action = makeAdmin ? 'yönetici yapmak' : 'yönetici yetkisini kaldırmak';
        if (!confirm(`${email} kullanıcısını ${action} istediğinizden emin misiniz?`)) {
            return;
        }
        
        console.log('Kullanıcı rol değiştirme işlemi başlatılıyor:', { email, makeAdmin });
        
        fetch(API_ENDPOINTS.MAKE_ADMIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, makeAdmin })
        })
        .then(response => {
            console.log('Sunucu yanıt durumu:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Sunucu yanıt içeriği:', text);
                    throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Sunucu yanıtı:', data);
            if (data.success) {
                showNotification('Başarılı', makeAdmin ? 'Kullanıcı yönetici yapıldı.' : 'Kullanıcı normal kullanıcı yapıldı.', 'success');
                loadUsers();
            } else {
                showNotification('Hata', data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Toggle admin role error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function deleteEvent(eventId) {
        if (!eventId) {
            console.error('Event ID parametresi eksik');
            return;
        }

        fetch(`${API_ENDPOINTS.DELETE_EVENT}/${eventId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Etkinlik başarıyla silindi.', 'success');
                loadEvents();
            } else {
                showNotification('Hata', data.message || 'Etkinlik silinirken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Delete event error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function deleteAnnouncement(announcementId) {
        if (!announcementId) {
            console.error('Announcement ID parametresi eksik');
            return;
        }

        fetch(`${API_ENDPOINTS.DELETE_ANNOUNCEMENT}/${announcementId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Duyuru başarıyla silindi.', 'success');
                loadAnnouncements();
            } else {
                showNotification('Hata', data.message || 'Duyuru silinirken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Delete announcement error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function updateAnnouncement(announcementId, announcementData) {
        fetch(`${API_ENDPOINTS.UPDATE_ANNOUNCEMENT}/${announcementId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(announcementData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Duyuru başarıyla güncellendi.', 'success');
                announcementModal.style.display = 'none';
                announcementForm.reset();
                loadAnnouncements();
            } else {
                showNotification('Hata', data.message || 'Duyuru güncellenirken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Update announcement error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function addEvent(eventData) {
        fetch(API_ENDPOINTS.ADD_EVENT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(eventData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Etkinlik başarıyla eklendi.', 'success');
                eventModal.style.display = 'none';
                eventForm.reset();
                loadEvents();
            } else {
                showNotification('Hata', data.message || 'Etkinlik eklenirken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Add event error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function updateEvent(eventId, eventData) {
        fetch(`${API_ENDPOINTS.UPDATE_EVENT}/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(eventData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Etkinlik başarıyla güncellendi.', 'success');
                eventModal.style.display = 'none';
                eventForm.reset();
                loadEvents();
            } else {
                showNotification('Hata', data.message || 'Etkinlik güncellenirken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Update event error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function approveUser(email) {
        if (!email) {
            console.error('Email parametresi eksik');
            return;
        }

        if (!confirm(`${email} kullanıcısını onaylamak istediğinizden emin misiniz?`)) {
            return;
        }

        fetch(API_ENDPOINTS.APPROVE_USER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Kullanıcı başarıyla onaylandı.', 'success');
                loadUsers();
            } else {
                showNotification('Hata', data.message || 'Kullanıcı onaylanırken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }

    function deleteUser(email) {
        if (!email) {
            console.error('Email parametresi eksik');
            return;
        }

        if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
            fetch(API_ENDPOINTS.DELETE_USER, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Başarılı', 'Kullanıcı başarıyla silindi.', 'success');
                    loadUsers();
                } else {
                    showNotification('Hata', data.message || 'Kullanıcı silinirken bir hata oluştu.', 'error');
                }
            })
            .catch(error => {
                showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
            });
        }
    }

    function addAnnouncement(announcementData) {
        fetch(API_ENDPOINTS.ADD_ANNOUNCEMENT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(announcementData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Başarılı', 'Duyuru başarıyla eklendi.', 'success');
                announcementModal.style.display = 'none';
                announcementForm.reset();
                loadAnnouncements();
            } else {
                showNotification('Hata', data.message || 'Duyuru eklenirken bir hata oluştu.', 'error');
            }
        })
        .catch(error => {
            console.error('Add announcement error:', error);
            showNotification('Hata', 'Sunucu hatası oluştu.', 'error');
        });
    }
});