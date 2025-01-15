const db = require('../config/db'); // Підключаємо базу даних

const favoriteController = {
    getFavorites: (req, res) => {
        if (req.user) {
            const userId = req.user.id;

            db.query(`
                SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.category_id, p.image_url
                FROM favorites f
                JOIN products p ON f.product_id = p.id
                WHERE f.user_id = ?`, [userId],
                (err, favorites) => {
                    if (err) {
                        res.status(500).json({ error: 'Failed to retrieve favorites: ' + err.message });
                    } else {
                        res.json({ favorites });
                    }
                }
            );
        } else {
            // Логіка для неавторизованих користувачів
            const favoriteIds = req.cookies.favorites ? JSON.parse(req.cookies.favorites) : [];

            if (favoriteIds.length > 0) {
                db.query(`
                    SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.category_id, p.image_url
                    FROM products p
                    WHERE p.id IN (?)`, [favoriteIds],
                    (err, favorites) => {
                        if (err) {
                            res.status(500).json({ error: 'Failed to retrieve favorites: ' + err.message });
                        } else {
                            res.json({ favorites });
                        }
                    }
                );
            } else {
                res.json({ favorites: [] });
            }
        }
    },

    addToFavorites: (req, res) => {
        const { product_id } = req.params;

        if (req.user) {
            // Логіка для авторизованих користувачів (додавання в базу даних)
            const userId = req.user.id;

            db.query('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?', [userId, product_id], (err, existing) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to check favorites: ' + err.message });
                } else if (existing.length === 0) {
                    db.query('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)', [userId, product_id], (err) => {
                        if (err) {
                            res.status(500).json({ error: 'Failed to add product to favorites: ' + err.message });
                        } else {
                            res.json({ message: 'Product added to favorites in database for authorized user', userId, product_id });
                        }
                    });
                } else {
                    res.status(400).json({ message: 'Product already in favorites' });
                }
            });
        } else {
            // Логіка для неавторизованих користувачів
            let favorites = req.cookies.favorites ? JSON.parse(req.cookies.favorites) : [];

            if (!favorites.includes(product_id)) {
                favorites.push(product_id);
            }

            // Оновлюємо cookies
            res.cookie('favorites', JSON.stringify(favorites), { httpOnly: true, maxAge: 86400 * 1000 });
            res.json({ message: 'Product added to favorites', favorites });
        }
    },

    removeFromFavorites: (req, res) => {
        const { product_id } = req.params;

        if (req.user) {
            // Логіка для авторизованих користувачів (видалення з бази даних)
            const userId = req.user.id;

            db.query('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [userId, product_id], (err) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to remove product from favorites: ' + err.message });
                } else {
                    res.json({ message: 'Product removed from favorites in database for authorized user', userId, product_id });
                }
            });
        } else {
            // Логіка для неавторизованих користувачів
            let favorites = req.cookies.favorites ? JSON.parse(req.cookies.favorites) : [];
            favorites = favorites.filter(id => id !== product_id);

            res.cookie('favorites', JSON.stringify(favorites), { httpOnly: true, maxAge: 86400 * 1000 });
            res.json({ message: 'Product removed from favorites', favorites });
        }
    }
};

module.exports = favoriteController;
