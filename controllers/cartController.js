const db = require('../config/db'); // Підключаємо базу даних

const cartController = {
    getCart: (req, res) => {
        if (req.user) {
            // Логіка для авторизованих користувачів (отримання з бази даних)
            const userId = req.user.id;
    
            db.query(`
                SELECT 
                    p.id AS product_id, 
                    p.name, 
                    p.description, 
                    p.price, 
                    p.stock_quantity, 
                    p.image_url, 
                    ci.quantity 
                FROM cart_items ci 
                JOIN products p ON ci.product_id = p.id 
                JOIN cart c ON ci.cart_id = c.id 
                WHERE c.user_id = ?`, [userId],
                (err, cartItems) => {
                    if (err) {
                        res.status(500).json({ error: 'Failed to retrieve cart: ' + err.message });
                    } else {
                        res.json(cartItems);
                    }
                }
            );
        } else {
            // Логіка для неавторизованих користувачів
            const cart = req.cookies.cart ? JSON.parse(req.cookies.cart) : [];
    
            if (cart.length > 0) {
                // Отримуємо ID продуктів із кошика
                const productIds = cart.map(item => item.productId);
    
                // Виконуємо запит для отримання повної інформації про ці продукти
                db.query(`
                    SELECT 
                        p.id AS product_id, 
                        p.name, 
                        p.description, 
                        p.price, 
                        p.stock_quantity, 
                        p.image_url 
                    FROM products p 
                    WHERE p.id IN (?)`, [productIds],
                    (err, products) => {
                        if (err) {
                            res.status(500).json({ error: 'Failed to retrieve products: ' + err.message });
                        } else {
                            // Додаємо кількість до кожного продукту
                            const cartWithDetails = products.map(product => {
                                const cartItem = cart.find(item => item.productId === product.product_id);
                                return { ...product, quantity: cartItem.quantity };
                            });
                            res.json(cartWithDetails);
                        }
                    }
                );
            } else {
                res.json({ cart: [] });
            }
        }
    },
    
    
    addToCart: (req, res) => {
        const { productId, quantity } = req.body;
    
        if (req.user) {
            // Логіка для авторизованих користувачів (додавання в базу даних)
            const userId = req.user.id;
    
            // Спочатку перевіряємо, чи існує кошик для користувача
            db.query(`
                SELECT id FROM cart WHERE user_id = ? AND status = 'active'`, [userId],
                (err, cart) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to check cart: ' + err.message });
                    }
    
                    let cartId;
                    if (cart.length > 0) {
                        // Якщо кошик існує, беремо його ID
                        cartId = cart[0].id;
                    } else {
                        // Якщо кошика немає, створюємо новий
                        db.query(`INSERT INTO cart (user_id, status, total_price) VALUES (?, 'active', 0)`, [userId],
                            (err, result) => {
                                if (err) {
                                    return res.status(500).json({ error: 'Failed to create cart: ' + err.message });
                                }
                                cartId = result.insertId;
                            });
                    }
    
                    // Додаємо товар до кошика після перевірки або створення
                    db.query(`
                        SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?`, [cartId, productId],
                        (err, existing) => {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to check cart items: ' + err.message });
                            }
    
                            if (existing.length > 0) {
                                // Якщо товар вже є у кошику, оновлюємо кількість
                                db.query(`
                                    UPDATE cart_items 
                                    SET quantity = quantity + ? 
                                    WHERE cart_id = ? AND product_id = ?`, 
                                    [quantity, cartId, productId],
                                    (err) => {
                                        if (err) {
                                            return res.status(500).json({ error: 'Failed to update cart item: ' + err.message });
                                        }
                                        res.json({ message: 'Cart item updated for authorized user', cartId, productId, quantity });
                                    }
                                );
                            } else {
                                // Якщо товару немає у кошику, додаємо його
                                db.query(`
                                    INSERT INTO cart_items (cart_id, product_id, quantity) 
                                    VALUES (?, ?, ?)`, 
                                    [cartId, productId, quantity],
                                    (err) => {
                                        if (err) {
                                            return res.status(500).json({ error: 'Failed to add product to cart: ' + err.message });
                                        }
                                        res.json({ message: 'Product added to cart for authorized user', cartId, productId, quantity });
                                    }
                                );
                            }
                        }
                    );
                }
            );
        } else {
            // Логіка для неавторизованих користувачів
            let cart = req.cookies.cart ? JSON.parse(req.cookies.cart) : [];
    
            const itemIndex = cart.findIndex(item => item.productId === productId);
            if (itemIndex !== -1) {
                cart[itemIndex].quantity += quantity;
            } else {
                cart.push({ productId, quantity });
            }
    
            res.cookie('cart', JSON.stringify(cart), { httpOnly: true, maxAge: 86400 * 1000 });
            res.json({ message: 'Product added to cart', cart });
        }
    },
    
    updateCartItem: (req, res) => {
        const { productId, quantity } = req.body;

        if (req.user) {
            // Логіка для авторизованих користувачів (оновлення в базі даних)
            const userId = req.user.id;

            db.query(`
                UPDATE cart_items 
                SET quantity = ? 
                WHERE cart_id = (SELECT id FROM cart WHERE user_id = ?) AND product_id = ?`, 
                [quantity, userId, productId],
                (err) => {
                    if (err) {
                        res.status(500).json({ error: 'Failed to update cart item: ' + err.message });
                    } else {
                        res.json({ message: 'Cart item updated for authorized user', userId, productId, quantity });
                    }
                }
            );
        } else {
            // Логіка для неавторизованих користувачів
            let cart = req.cookies.cart ? JSON.parse(req.cookies.cart) : [];

            const itemIndex = cart.findIndex(item => item.productId === productId);
            if (itemIndex !== -1) {
                cart[itemIndex].quantity = quantity;
            }

            res.cookie('cart', JSON.stringify(cart), { httpOnly: true, maxAge: 86400 * 1000 });
            res.json({ message: 'Cart item updated', cart });
        }
    },

    removeFromCart: (req, res) => {
        
        const { item_id } = req.params;
        if (req.user) {
            // Логіка для авторизованих користувачів (видалення з бази даних)
            const userId = req.user.id;

            db.query(`
                DELETE FROM cart_items 
                WHERE cart_id = (SELECT id FROM cart WHERE user_id = ?) AND product_id = ?`, 
                [userId, item_id],
                (err) => {
                    if (err) {
                        res.status(500).json({ error: 'Failed to remove product from cart: ' + err.message });
                    } else {
                        res.json({ message: 'Product removed from cart for authorized user', userId, item_id });
                    }
                }
            );
        } else {
            // Логіка для неавторизованих користувачів
            let cart = req.cookies.cart ? JSON.parse(req.cookies.cart) : [];
            cart = cart.filter(item => item.productId != item_id);
            res.cookie('cart', JSON.stringify(cart), { httpOnly: true, maxAge: 86400 * 1000 });
            res.json({ message: 'Product removed from cart', cart });
        }
    },
    clearCart: (req, res) => {
        if (req.user) {
            // Logic for authorized users (clear items from the database)
            const userId = req.user.id;

            db.query(`
                DELETE FROM cart_items 
                WHERE cart_id = (SELECT id FROM cart WHERE user_id = ?)`, 
                [userId],
                (err) => {
                    if (err) {
                        res.status(500).json({ error: 'Failed to clear cart: ' + err.message });
                    } else {
                        res.json({ message: 'Cart cleared for authorized user', userId });
                    }
                }
            );
        } else {
            // Logic for non-authorized users (clear items from cookies)
            res.clearCookie('cart', { httpOnly: true, maxAge: 86400 * 1000 });
            res.json({ message: 'Cart cleared for non-authorized user' });
        }
    }
};

module.exports = cartController;
