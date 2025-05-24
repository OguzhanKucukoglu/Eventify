const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 3306;
const database = process.env.DB_NAME || 'eventify_db';
const username = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD;

const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'mysql',
  logging: false
});

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  firstLogin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

const Interest = sequelize.define('Interest', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

const UserInterest = sequelize.define('UserInterest', {});
User.belongsToMany(Interest, { through: UserInterest });
Interest.belongsToMany(User, { through: UserInterest });

const Event = sequelize.define('Event', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  date: {
    type: DataTypes.DATEONLY
  },
  time: {
    type: DataTypes.TIME
  },
  location: {
    type: DataTypes.STRING
  },
  type: {
    type: DataTypes.STRING
  },
  capacity: {
    type: DataTypes.INTEGER
  },
  remainingCapacity: {
    type: DataTypes.INTEGER
  },
  price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  image: {
    type: DataTypes.STRING
  }
});

const Announcement = sequelize.define('Announcement', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const Order = sequelize.define('Order', {
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  orderGroupId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  eventTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  orderDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'completed'
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı başarılı.');
    return true;
  } catch (error) {
    console.error('Veritabanı bağlantısı başarısız:', error);
    return false;
  }
};

const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('Veritabanı tabloları oluşturuldu.');
    return true;
  } catch (error) {
    console.error('Veritabanı tabloları oluşturulamadı:', error);
    return false;
  }
};

const migrateXmlToDatabase = async () => {};

module.exports = {
  sequelize,
  User,
  Interest,
  UserInterest,
  Event,
  Announcement,
  Order,
  testConnection,
  syncDatabase,
  migrateXmlToDatabase
};
