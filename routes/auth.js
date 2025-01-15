const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');


// Маршрути для реєстрації, логіну та лог-ауту
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Маршрут для перевірки ролі користувача
router.get('/isAdmin', authenticateToken, authController.isAdmin);

module.exports = router;
