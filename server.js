const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');  // Додайте nodemailer

const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const favoriteRoutes = require('./routes/favorites');
const orderRoutes = require('./routes/orders');
const contactsRoutes = require('./routes/contacts');

dotenv.config();

const app = express();

// CORS configuration to allow credentials from swanshop.com.ua
const allowedOrigins = ['http://swanshop.com.ua', 'http://api.swanshop.com.ua'];

app.use(cors({
    origin: function (origin, callback) {
        // Перевіряємо, чи є джерело у списку дозволених
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true  // Дозволяємо кукі
}));

app.use(bodyParser.json());
app.use(cookieParser());

// Attach routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contacts', contactsRoutes);

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port`);
});
