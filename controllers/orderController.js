const db = require('../config/db');
const nodemailer = require('nodemailer');

// Отримати всі замовлення
exports.getAllOrders = (req, res) => {
    const query = 'SELECT * FROM orders';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Отримати замовлення за ID
exports.getOrderById = (req, res) => {
    const query = 'SELECT * FROM orders WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
};

// Створити замовлення для авторизованого користувача
exports.createOrder = (req, res) => {
    const { user_id, products, total_price, payment_method } = req.body; // Додаємо поле для методу оплати
    const query = 'INSERT INTO orders (user_id, total_price, status, payment_method) VALUES (?, ?, ?, ?)'; 
    const status = 'Нове'; 
    db.query(query, [user_id, total_price, status, payment_method], (err, result) => { // Передаємо метод оплати в запит
        if (err) return res.status(500).json({ error: err.message });

        const orderId = result.insertId;
        const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity) VALUES ?';
        const orderItems = products.map(product => [orderId, product.product_id, product.quantity]);

        db.query(orderItemsQuery, [orderItems], (itemsErr) => {
            if (itemsErr) return res.status(500).json({ error: itemsErr.message });
            res.status(201).json({ message: 'Order created successfully', orderId });
        });
    });
};

// Створити замовлення для неавторизованого користувача
exports.createOrderForGuest = (req, res) => {
    const { guest_name, guest_email, guest_phone, address, city, products, total_price, payment_method } = req.body;

    const guestQuery = 'INSERT INTO guests (name, email, phone, address, city, payment_method) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.query(guestQuery, [guest_name, guest_email, guest_phone, address, city, payment_method], (guestErr, guestResult) => {
        if (guestErr) return res.status(500).json({ error: guestErr.message });

        const guestId = guestResult.insertId;
        const orderQuery = 'INSERT INTO orders (guest_id, total_price, status) VALUES (?, ?, ?)';
        const orderStatus = 'Нове';
        
        db.query(orderQuery, [guestId, total_price, orderStatus], (orderErr, orderResult) => {
            if (orderErr) return res.status(500).json({ error: orderErr.message });

            const orderId = orderResult.insertId;
            const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity) VALUES ?';
            const orderItems = products.map(product => [orderId, product.product_id, product.quantity]);

            db.query(orderItemsQuery, [orderItems], (itemsErr) => {
                if (itemsErr) return res.status(500).json({ error: itemsErr.message });

                const productIds = products.map(product => product.product_id);
                const productDetailsQuery = 'SELECT id, name, price, image_url FROM products WHERE id IN (?)';

                db.query(productDetailsQuery, [productIds], (productErr, productDetails) => {
                    if (productErr) return res.status(500).json({ error: productErr.message });

                    const enrichedProducts = products.map(product => {
                        const productDetail = productDetails.find(p => p.id === product.product_id);
                        return {
                            ...product,
                            name: productDetail.name,
                            price: productDetail.price,
                            image_url: productDetail.image_url
                        };
                    });

                    // Надсилаємо підтвердження замовлення на email користувача
                    sendOrderConfirmationEmail(guest_email, orderId, enrichedProducts, total_price, address, city, payment_method, guest_name);
                    // Надсилаємо повідомлення адміністратору
                    sendAdminNotification(orderId, total_price, payment_method, guest_name);

                    res.status(201).json({ message: 'Order created successfully for guest', orderId });
                });
            });
        });
    });
};



const sendOrderConfirmationEmail = (email, orderId, products, total_price, address, city, payment_method, guest_name) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: 'picaprogpt@gmail.com', 
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const productList = products.map(product => `
        <tr>
            <td><img src="${product.image_url}" alt="${product.name}" width="50" height="50"></td>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>${product.price} грн</td>
            <td>${(product.quantity * product.price).toFixed(2)} грн</td>
        </tr>
    `).join('');

    const mailOptions = {
        from: 'info@swan.shop.com',
        to: email, 
        subject: `Підтвердження замовлення - Замовлення #${orderId}`,
        html: `
        <h2>Дякуємо за ваше замовлення, ${guest_name}!</h2> <!-- Додаємо ім'я гостя -->
        <p>Інформація про ваше замовлення:</p>
        <p><strong>Номер замовлення:</strong> ${orderId}</p>

        <h3>Список товарів:</h3>
        <table border="1" cellpadding="10" cellspacing="0">
            <thead>
                <tr>
                    <th>Зображення</th>
                    <th>Назва продукту</th>
                    <th>Кількість</th>
                    <th>Ціна за одиницю</th>
                    <th>Загальна сума</th>
                </tr>
            </thead>
            <tbody>
                ${productList}
            </tbody>
        </table>

        <p><strong>Загальна сума замовлення:</strong> ${total_price} грн</p>

        <h3>Деталі доставки:</h3>
        <p><strong>Адреса:</strong> ${address}, ${city}</p>
        <p><strong>Спосіб оплати:</strong> ${payment_method}</p>

        <p>Найближчим часом наш менеджер зв'яжеться з вами для підтвердження замовлення.</p>
        <p>Дякуємо за покупку у нашому магазині!</p>
        `
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log('Помилка при відправці листа:', err);
        } else {
            console.log('Лист відправлено: ' + info.response);
        }
    });
};


const sendAdminNotification = (orderId, total_price, payment_method, guest_name) => {
    const adminEmail = 'dpolivanoy@gmail.com'; // Електронна пошта адміністратора
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'picaprogpt@gmail.com',
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: 'info@swan.shop.co',
        to: adminEmail,
        subject: `Нове замовлення - Замовлення #${orderId}`,
        html: `
        <h2>Нове замовлення!</h2>
        <p><strong>Номер замовлення:</strong> ${orderId}</p>
        <p><strong>Замовник:</strong> ${guest_name}</p> <!-- Додаємо ім'я гостя -->
        <p><strong>Загальна сума замовлення:</strong> ${total_price} грн</p>
        <p><strong>Спосіб оплати:</strong> ${payment_method}</p>
        `
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log('Помилка при відправці листа адміністратору:', err);
        } else {
            console.log('Повідомлення адміністратору відправлено: ' + info.response);
        }
    });
};



// Оновити замовлення
exports.updateOrder = (req, res) => {
    const { status } = req.body;
    const query = 'UPDATE orders SET status = ? WHERE id = ?';
    db.query(query, [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order updated successfully' });
    });
};

// Видалити замовлення
exports.deleteOrder = (req, res) => {
    const query = 'DELETE FROM orders WHERE id = ?';
    db.query(query, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order deleted successfully' });
    });
};

exports.getGuestOrderById = (req, res) => {
    const query = 'SELECT * FROM guests WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
}

exports.getOrderProductsById = (req, res) => {
    const order_id = req.params.order_id;
    
    db.query(`
        SELECT 
            p.id AS product_id, 
            p.name, 
            p.description, 
            p.price, 
            p.stock_quantity, 
            p.image_url, 
            oi.quantity
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?`, 
        [order_id],
        (err, orderItems) => {
            if (err) {
                res.status(500).json({ error: 'Failed to retrieve order: ' + err.message });
            } else {
                res.json(orderItems);
            }
        }
    );
}
