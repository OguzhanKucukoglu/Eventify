const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const xml2js = require('xml2js');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const { User, Interest, Announcement, Order, sequelize } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'event-management-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 3600000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const eventsFile = path.join(dataDir, 'events.xml');

if (!fs.existsSync(eventsFile)) {
  const eventsData = { events: { event: [] } };
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(eventsData);
  fs.writeFileSync(eventsFile, xml);
}

const readXmlFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      
      const parser = new xml2js.Parser();
      parser.parseString(data, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });
};

const writeXmlFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(data);
    
    fs.writeFile(filePath, xml, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Forbidden' });
  }
};

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
  }
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

app.get('/register', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
  }
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  if (req.session.user.firstLogin) {
    res.redirect('/change-password');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  }
});

app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/change-password', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.get('/cart', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email ve şifre gereklidir' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Şifre en az 8 karakter uzunluğunda olmalıdır' });
    }
    
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|mil|co\.\w{2}|io|info|biz|me|tv|mobi|dev|xyz|online|store|tech|app|site|blog|cloud|digital|network|systems|academy|agency|center|company|design|email|group|institute|international|solutions|team|technology|today|world)$/i;
    
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Geçersiz e-posta formatı. Lütfen geçerli bir e-posta adresi girin (örn: ornek@domain.com)' });
    }
    
    if (email.includes(' ')) {
      return res.status(400).json({ success: false, message: 'E-posta adresi boşluk içeremez' });
    }
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu email adresi zaten kayıtlı' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      role: 'user',
      approved: false,
      firstLogin: true
    });
    
    const defaultInterests = ['Spor', 'Sinema', 'Konser', 'Tiyatro'];
    for (const interestName of defaultInterests) {
      const [interest] = await Interest.findOrCreate({ where: { name: interestName } });
      await newUser.addInterest(interest);
    }
    
    res.status(201).json({ success: true, message: 'Kayıt başarılı. Yönetici onayı bekleniyor.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email ve şifre gereklidir' });
    }
    
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Interest }]
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Geçersiz email veya şifre' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ success: false, message: 'Geçersiz email veya şifre' });
    }
    
    if (!user.approved) {
      return res.status(400).json({ success: false, message: 'Hesabınız henüz onaylanmadı' });
    }
    
    if (user.blocked) {
      return res.status(403).json({ success: false, message: 'Hesabınız engellendi. Yönetici ile iletişime geçin.' });
    }
    
    req.session.user = {
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin,
      interests: user.Interests.map(interest => interest.name),
      city: user.city,
      blocked: user.blocked || false
    };
    
    res.json({ 
      success: true, 
      message: 'Giriş başarılı', 
      firstLogin: user.firstLogin,
      role: user.role
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/change-password', isAuthenticated, async (req, res) => {
  try {
    const { password } = req.body;
    const userEmail = req.session.user.email;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Şifre gereklidir' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Şifreniz en az 8 karakterli olmalıdır!' });
    }
    
    const user = await User.findOne({ where: { email: userEmail } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ success: false, message: 'Lütfen ilk kayıtta kullandığınız şifreden farklı bir şifre girin' });
    }
    
    user.password = bcrypt.hashSync(password, 10);
    user.firstLogin = false;
    await user.save();
    
    req.session.user.firstLogin = false;
    
    res.json({ success: true, message: 'Şifre değiştirildi' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Çıkış yapıldı' });
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    
    const orders = await Order.findAll({
      where: { userEmail: userEmail },
      order: [['orderDate', 'DESC']]
    });
    
    res.json({ success: true, orders: orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.get('/api/user', isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    
    const user = await User.findOne({ 
      where: { email: userEmail },
      include: [{ model: Interest }]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    req.session.user = {
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin,
      interests: user.Interests.map(interest => interest.name),
      city: user.city
    };
    
    res.json({ 
      success: true, 
      user: req.session.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const eventsData = await readXmlFile(eventsFile);
    
    if (!eventsData || !eventsData.events || !Array.isArray(eventsData.events.event)) {
      console.error('Events data format is invalid:', eventsData);
      return res.json({ success: true, events: [] });
    }
    
    const eventList = eventsData.events.event
      .filter(event => event && typeof event === 'object')
      .map(event => {
        try {
          const capacity = Array.isArray(event.capacity) ? parseInt(event.capacity[0]) : 0;
          const remainingCapacity = Array.isArray(event.remainingCapacity) ? 
            parseInt(event.remainingCapacity[0]) : capacity;
            
          
          return {
            id: Array.isArray(event.id) ? event.id[0] : '',
            title: Array.isArray(event.title) ? event.title[0] : '',
            description: Array.isArray(event.description) ? event.description[0] : '',
            date: Array.isArray(event.date) ? event.date[0] : '',
            time: Array.isArray(event.time) ? event.time[0] : '',
            location: Array.isArray(event.location) ? event.location[0] : '',
            type: Array.isArray(event.type) ? event.type[0] : '',
            capacity: capacity,
            remainingCapacity: remainingCapacity,
            price: Array.isArray(event.price) ? parseFloat(event.price[0]) : 0,
            image: Array.isArray(event.image) ? event.image[0] : null
          };
        } catch (err) {
          console.error('Event mapping error');
          return null;
        }
      })
      .filter(event => event !== null);
      
    
    eventList.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({ success: true, events: eventList });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.get('/api/weather/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=tr`);
    const data = await response.json();
    
    if (data.cod !== 200) {
      return res.status(400).json({ success: false, message: 'Hava durumu bilgisi alınamadı' });
    }
    
    const weather = {
      city: data.name,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      suitable: data.main.temp > 15 && data.wind.speed < 10 && data.weather[0].main !== 'Rain'
    };
    
    res.json({ success: true, weather });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ success: false, message: 'Hava durumu bilgisi alınamadı' });
  }
});

app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Interest }]
    });
    
    const userList = users.map(user => ({
      email: user.email,
      role: user.role,
      approved: user.approved,
      firstLogin: user.firstLogin,
      interests: user.Interests.map(interest => interest.name),
      city: user.city,
      blocked: user.blocked || false
    }));
    
    res.json({ success: true, users: userList });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/admin/approve-user', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email gereklidir' });
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    user.approved = true;
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/admin/delete-user', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email gereklidir' });
    }
    
    if (email === req.session.user.email) {
      return res.status(400).json({ success: false, message: 'Kendi hesabınızı silemezsiniz' });
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    await user.destroy();
    
    res.json({ success: true, message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/admin/toggle-block-user', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { email, blocked } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email gereklidir' });
    }
    
    if (email === req.session.user.email) {
      return res.status(400).json({ success: false, message: 'Kendi hesabınızı engelleyemezsiniz' });
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    user.blocked = blocked;
    await user.save();
    
    const message = blocked ? 'Kullanıcı erişimi engellendi' : 'Kullanıcı erişimi açıldı';
    res.json({ success: true, message });
  } catch (error) {
    console.error('Toggle block user error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/admin/make-admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { email, makeAdmin } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email gereklidir' });
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    user.role = makeAdmin ? 'admin' : 'user';
    await user.save();
    
    const message = makeAdmin ? 'Kullanıcı yönetici yapıldı' : 'Kullanıcı normal kullanıcı yapıldı';
    res.json({ success: true, message });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/update-city', isAuthenticated, async (req, res) => {
  try {
    const { city } = req.body;
    const userEmail = req.session.user.email;
    
    if (!city) {
      return res.status(400).json({ success: false, message: 'Şehir bilgisi gereklidir' });
    }
    
    const user = await User.findOne({ where: { email: userEmail } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    user.city = city;
    await user.save();
    
    req.session.user.city = city;
    
    res.json({ success: true, message: 'Şehir bilgisi güncellendi' });
  } catch (error) {
    console.error('Update city error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/update-interests', isAuthenticated, async (req, res) => {
  try {
    const { interests } = req.body;
    const userEmail = req.session.user.email;
    
    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({ success: false, message: 'İlgi alanları gereklidir' });
    }
    
    const user = await User.findOne({ where: { email: userEmail } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    await user.setInterests([]);
    
    for (const interestName of interests) {
      const [interest] = await Interest.findOrCreate({ where: { name: interestName } });
      await user.addInterest(interest);
    }
    
    req.session.user.interests = interests;
    
    res.json({ success: true, message: 'İlgi alanları güncellendi' });
  } catch (error) {
    console.error('Update interests error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.get('/api/recommended-events', isAuthenticated, async (req, res) => {
  try {
    const userInterests = req.session.user.interests || [];
    
    if (!userInterests || userInterests.length === 0) {
      return res.json({ success: true, events: [] });
    }

    const eventsData = await readXmlFile(eventsFile);
    
    if (!eventsData || !eventsData.events || !Array.isArray(eventsData.events.event)) {
      console.error('Events data format is invalid:', eventsData);
      return res.json({ success: true, events: [] });
    }

    const recommendedEvents = eventsData.events.event
      .filter(event => {
        try {
          return event && 
                 typeof event === 'object' && 
                 Array.isArray(event.type) && 
                 event.type[0] && 
                 userInterests.includes(event.type[0]);
        } catch (err) {
          console.error('Event filtering error:', err);
          return false;
        }
      })
      .map(event => {
        try {
          return {
            id: Array.isArray(event.id) ? event.id[0] : '',
            title: Array.isArray(event.title) ? event.title[0] : '',
            description: Array.isArray(event.description) ? event.description[0] : '',
            date: Array.isArray(event.date) ? event.date[0] : '',
            time: Array.isArray(event.time) ? event.time[0] : '',
            location: Array.isArray(event.location) ? event.location[0] : '',
            type: Array.isArray(event.type) ? event.type[0] : '',
            capacity: Array.isArray(event.capacity) ? parseInt(event.capacity[0]) : 0,
            remainingCapacity: Array.isArray(event.remainingCapacity) ? parseInt(event.remainingCapacity[0]) : 0,
            price: Array.isArray(event.price) ? parseFloat(event.price[0]) : 0,
            image: Array.isArray(event.image) ? event.image[0] : null
          };
        } catch (err) {
          console.error('Event mapping error:', err);
          return null;
        }
      })
      .filter(event => event !== null);
    
    recommendedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({ success: true, events: recommendedEvents });
  } catch (error) {
    console.error('Get recommended events error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

function generateOrderNumber() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `EVT-${timestamp}-${random}`;
}

app.post('/api/purchase-tickets', isAuthenticated, async (req, res) => {
  try {
    const { cartItems, paymentMethod } = req.body;
    
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Sepet boş veya geçersiz format' });
    }
    
    const events = await readXmlFile(eventsFile);
    
    let totalAmount = 0;
    const processedItems = [];
    
    for (const item of cartItems) {
      const { eventId, quantity } = item;
      
      if (!eventId || !quantity) {
        continue; 
      }
      
      const eventIndex = events.events.event.findIndex(event => event.id[0] === eventId);
      
      if (eventIndex === -1) {
        continue;
      }
      
      const event = events.events.event[eventIndex];
      const oldRemainingCapacity = parseInt(event.remainingCapacity ? event.remainingCapacity[0] : event.capacity[0]);
      if (oldRemainingCapacity < quantity) {
        continue; 
      }
      
      const newRemainingCapacity = oldRemainingCapacity - quantity;
      events.events.event[eventIndex].remainingCapacity = [newRemainingCapacity.toString()];
      
      await writeXmlFile(eventsFile, events);
      
      const itemPrice = parseFloat(event.price[0]);
      const itemTotal = itemPrice * quantity;
      totalAmount += itemTotal;
      
      processedItems.push({
        eventId,
        eventTitle: event.title[0],
        quantity,
        price: itemPrice,
        totalAmount: itemTotal
      });
    }
    
    await writeXmlFile(eventsFile, events);
    
    const orderNumber = generateOrderNumber();
    
    if (processedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Hiçbir ürün işlenemedi' });
    }
    
    const orderGroupId = generateOrderNumber();
    
    const savedOrders = [];
    for (const item of processedItems) {
      const uniqueOrderNumber = `${orderGroupId}-${item.eventId}`;
      
      const orderDetails = {
        orderNumber: uniqueOrderNumber,
        orderGroupId: orderGroupId, 
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        quantity: item.quantity,
        price: item.price,
        totalAmount: item.totalAmount,
        paymentMethod: paymentMethod,
        orderDate: new Date().toISOString(),
        userEmail: req.session.user.email,
        status: 'completed'
      };
      
      try {
        const savedOrder = await Order.create(orderDetails);
        savedOrders.push(savedOrder);
      } catch (err) {
        console.error('Sipariş veritabanına kaydedilemedi:', err);
      }
    }
    
    const orderSummary = {
      orderGroupId: orderGroupId,
      items: processedItems,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      orderDate: new Date().toISOString()
    };
      
    res.json({ 
      success: true, 
      message: 'Bilet satın alındı', 
      orderNumber: orderGroupId,
      orderDetails: orderSummary
    });
  } catch (error) {
    console.error('Purchase tickets error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.post('/api/admin/add-event', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, description, date, time, location, type, capacity, price, image } = req.body;
    
    const eventsData = await readXmlFile(eventsFile);
    const events = eventsData.events.event || [];
    
    const newEvent = {
      id: [Date.now().toString()],
      title: [title],
      description: [description],
      date: [date],
      time: [time],
      location: [location],
      type: [type],
      capacity: [capacity.toString()],
      remainingCapacity: [capacity.toString()],
      price: [price.toString()],
      image: [image]
    };
    
    events.push(newEvent);
    eventsData.events.event = events;
    
    await writeXmlFile(eventsFile, eventsData);
    
    res.json({
      success: true,
      message: 'Etkinlik başarıyla eklendi',
      event: {
        id: newEvent.id[0],
        title,
        description,
        date,
        time,
        location,
        type,
        capacity,
        remainingCapacity: capacity,
        price,
        image
      }
    });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ success: false, message: 'Etkinlik eklenirken bir hata oluştu' });
  }
});

app.put('/api/admin/update-event/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location, type, capacity, price, image } = req.body;
    
    if (!title || !description || !date || !time || !location || !type || !capacity || !price) {
      return res.status(400).json({ success: false, message: 'Tüm alanlar gereklidir' });
    }
    
    const events = await readXmlFile(eventsFile);
    
    const eventIndex = events.events.event.findIndex(event => event.id[0] === id);
    
    if (eventIndex === -1) {
      return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });
    }
    
    events.events.event[eventIndex].title[0] = title;
    events.events.event[eventIndex].description[0] = description;
    events.events.event[eventIndex].date[0] = date;
    const oldCapacity = parseInt(events.events.event[eventIndex].capacity[0]);
    const newCapacity = parseInt(capacity);
    let remainingCapacity = oldCapacity;
    
    if (newCapacity > oldCapacity) {
      const oldRemaining = parseInt(events.events.event[eventIndex].remainingCapacity?.[0] || oldCapacity);
      remainingCapacity = oldRemaining + (newCapacity - oldCapacity);
    } else if (newCapacity < oldCapacity) {
      const oldRemaining = parseInt(events.events.event[eventIndex].remainingCapacity?.[0] || oldCapacity);
      const soldTickets = oldCapacity - oldRemaining;
      remainingCapacity = Math.max(0, newCapacity - soldTickets);
    } else {
      remainingCapacity = parseInt(events.events.event[eventIndex].remainingCapacity?.[0] || oldCapacity);
    }
    
    events.events.event[eventIndex].time[0] = time;
    events.events.event[eventIndex].location[0] = location;
    events.events.event[eventIndex].type[0] = type;
    events.events.event[eventIndex].capacity[0] = newCapacity.toString();
    events.events.event[eventIndex].remainingCapacity[0] = remainingCapacity.toString();
    events.events.event[eventIndex].price[0] = price.toString();
    
    if (image) {
      events.events.event[eventIndex].image = [image];
    }
    
    await writeXmlFile(eventsFile, events);
    
    res.json({ success: true, message: 'Etkinlik güncellendi' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.delete('/api/admin/delete-event/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventsData = await readXmlFile(eventsFile);
    const events = eventsData.events.event || [];
    
    const eventIndex = events.findIndex(event => event.id[0] === eventId);
    
    if (eventIndex === -1) {
      return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });
    }
    
    events.splice(eventIndex, 1);
    eventsData.events.event = events;
    
    await writeXmlFile(eventsFile, eventsData);
    
    res.json({ success: true, message: 'Etkinlik başarıyla silindi' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Etkinlik silinirken bir hata oluştu' });
  }
});

app.post('/api/admin/add-announcement', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    const announcement = await Announcement.create({
      title,
      content
    });
    
    res.json({
      success: true,
      message: 'Duyuru başarıyla eklendi',
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        createdAt: announcement.createdAt
      }
    });
  } catch (error) {
    console.error('Add announcement error:', error);
    res.status(500).json({ success: false, message: 'Duyuru eklenirken bir hata oluştu' });
  }
});

app.delete('/api/admin/delete-announcement/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const announcement = await Announcement.findByPk(announcementId);
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
    }
    
    await announcement.destroy();
    
    res.json({ success: true, message: 'Duyuru başarıyla silindi' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, message: 'Duyuru silinirken bir hata oluştu' });
  }
});

app.put('/api/admin/update-announcement/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Başlık ve içerik gereklidir' });
    }
    
    const announcement = await Announcement.findByPk(id);
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
    }
    
    announcement.title = title;
    announcement.content = content;
    announcement.updatedAt = new Date();
    await announcement.save();
    
    res.json({ 
      success: true, 
      message: 'Duyuru güncellendi',
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        date: announcement.date || announcement.createdAt.toISOString().split('T')[0],
        updatedAt: announcement.updatedAt
      }
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('MySQL veritabanı bağlantısı başarılı.');
  })
  .catch(err => {
    console.error('MySQL veritabanı bağlantısı başarısız:', err);
  });

app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.findAll();
    
    const simplifiedAnnouncements = [];
    
    for (const announcement of announcements) {
      simplifiedAnnouncements.push({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        date: announcement.date || announcement.createdAt.toISOString().split('T')[0]
      });
    }
    
    res.json({ success: true, announcements: simplifiedAnnouncements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.get('/api/admin/events', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const eventsData = await readXmlFile(eventsFile);
        const events = eventsData.events.event || [];
        
        res.json({
            success: true,
            events: events.map(event => ({
                id: event.id[0],
                title: event.title[0],
                description: event.description[0],
                date: event.date[0],
                time: event.time[0],
                location: event.location[0],
                type: event.type[0],
                capacity: parseInt(event.capacity[0]),
                price: parseFloat(event.price[0]),
                image: event.image[0]
            }))
        });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Etkinlikler yüklenirken bir hata oluştu' });
    }
});

app.get('/api/admin/announcements', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            announcements: announcements.map(announcement => ({
                id: announcement.id,
                title: announcement.title,
                content: announcement.content,
                createdAt: announcement.createdAt
            }))
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ success: false, message: 'Duyurular yüklenirken bir hata oluştu' });
    }
});

app.get('/api/user/current-password', isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await User.findOne({ where: { email: userEmail } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.json({ success: true, currentPassword: user.password });
  } catch (error) {
    console.error('Get current password error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
