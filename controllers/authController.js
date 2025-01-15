const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Реєстрація користувача
exports.register = (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const userRole = role === 'admin' ? 'user' : role || 'user';

    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
        db.query(query, [name, email, hashedPassword, userRole], (err) => {
            if (err) return res.status(500).json({ error: 'Error creating user: ' + err.message });
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
};

// Логін користувача
exports.login = (req, res) => {
    const { email, password } = req.body;

    // Перевірка наявності email та password
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = results[0];
        const isValidPassword = bcrypt.compareSync(password, user.password);

        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Генерація JWT токена з роллю користувача
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '12h' }
        );

        res.json({ token });
    });
};

// Вихід з системи 
exports.logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// Перевірка ролі користувача
exports.isAdmin = (req, res) => {
    const isAdmin = req.user.role === 'admin';
    res.json({ isAdmin });
};

