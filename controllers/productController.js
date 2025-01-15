const db = require('../config/db');

// Отримати всі продукти
exports.getAllProducts = (req, res) => {
    const query = 'SELECT * FROM products';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Отримати продукт за ID
exports.getProductById = (req, res) => {
    const query = 'SELECT * FROM products WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
};

// Додати продукт
exports.addProduct = (req, res) => {
    const { name, description, price, stock_quantity, category_id, image_url } = req.body;
    const query = 'INSERT INTO products (name, description, price, stock_quantity, category_id, image_url) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [name, description, price, stock_quantity, category_id, image_url], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Product added successfully' });
    });
};

// Оновити продукт
exports.updateProduct = (req, res) => {
    const { name, description, price, stock_quantity, category_id, image_url } = req.body;
    const query = 'UPDATE products SET name = ?, description = ?, price = ?, stock_quantity = ?, category_id = ?, image_url = ? WHERE id = ?';
    db.query(query, [name, description, price, stock_quantity, category_id, image_url, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product updated successfully' });
    });
};

// Видалити продукт
exports.deleteProduct = (req, res) => {
    const productId = req.params.id;

    // Перевірка, чи існує продукт
    const checkQuery = 'SELECT * FROM products WHERE id = ?';
    db.query(checkQuery, [productId], (err, productResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (productResults.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Оновлення замовлень
        const updateOrdersQuery = `UPDATE order_items SET product_id = 
            (SELECT id FROM products WHERE name = 'Видалений продукт' LIMIT 1) WHERE product_id = ?`;
        db.query(updateOrdersQuery, [productId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Видалення з кошика
            const deleteFromCartQuery = 'DELETE FROM cart_items WHERE product_id = ?';
            db.query(deleteFromCartQuery, [productId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Видалення з улюблених
                const deleteFromFavoritesQuery = 'DELETE FROM favorites WHERE product_id = ?';
                db.query(deleteFromFavoritesQuery, [productId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Тепер можна видаляти продукт
                    const deleteProductQuery = 'DELETE FROM products WHERE id = ?';
                    db.query(deleteProductQuery, [productId], (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Product deleted successfully' });
                    });
                });
            });
        });
    });
};

// Отримати всі продукти певної категорії
exports.getProductsByCategory = (req, res) => {
    const categoryId = req.params.category_id; // Отримання ID категорії з параметрів URL
    const query = 'SELECT * FROM products WHERE category_id = ?';

    db.query(query, [categoryId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};
// Отримати всі продукти певної категорії з пагінацією
exports.getProductsByCategory = (req, res) => {
    const categoryId = req.params.category_id; // Отримання ID категорії з параметрів URL
    const page = parseInt(req.query.page) || 1; // Номер сторінки (за замовчуванням 1)
    const limit = parseInt(req.query.limit) || 10; 
    const offset = (page - 1) * limit;
 
    // Запит для отримання загальної кількості продуктів в категорії (для визначення кількості сторінок)
    const countQuery = 'SELECT COUNT(*) AS total FROM products WHERE category_id = ?';
    db.query(countQuery, [categoryId], (countErr, countResult) => {
        if (countErr) return res.status(500).json({ error: countErr.message });

        const totalProducts = countResult[0].total;
        const totalPages = Math.ceil(totalProducts / limit); // Визначення кількості сторінок

        
        const query = 'SELECT * FROM products WHERE category_id = ? LIMIT ? OFFSET ?';
        
        db.query(query, [categoryId, limit, offset], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                page,
                totalPages,
                totalProducts,
                products: results
            });
        });
    });
};
// Пошук продуктів за назвою або описом
exports.searchProducts = (req, res) => {
    
    const searchTerm = req.query.q; 

    if (!searchTerm) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countQuery = `
        SELECT COUNT(*) AS total FROM products 
        WHERE name LIKE ? OR description LIKE ?
    `;
    const likeSearchTerm = `%${searchTerm}%`;

    db.query(countQuery, [likeSearchTerm, likeSearchTerm], (countErr, countResult) => {
        if (countErr) {
            return res.status(500).json({ error: 'Failed to perform search' });
        }

        const totalProducts = countResult[0].total; 
        const totalPages = Math.ceil(totalProducts / limit); 
        const query = `
            SELECT * FROM products 
            WHERE name LIKE ? OR description LIKE ? 
            LIMIT ? OFFSET ?
        `;

        db.query(query, [likeSearchTerm, likeSearchTerm, limit, offset], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to perform search' });
            }
            res.json({
                page,
                totalPages,
                totalProducts,
                products: results
            });
        });
    });
};
// Видалити всі продукти певної категорії
exports.deleteProductsByCategory = (req, res) => {
    const categoryId = req.params.category_id;

    const getProductsQuery = 'SELECT id FROM products WHERE category_id = ?';
    db.query(getProductsQuery, [categoryId], (err, productResults) => {
        if (err) return res.status(500).json({ error: err.message });

        if (productResults.length === 0) {
            return res.status(404).json({ message: 'No products found in this category' });
        }

        const updateOrdersQuery = `
            UPDATE order_items SET product_id = 
            (SELECT id FROM products WHERE name = 'Видалений продукт' LIMIT 1) 
            WHERE product_id IN (SELECT id FROM products WHERE category_id = ?)
        `;
        db.query(updateOrdersQuery, [categoryId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const deleteFromCartQuery = `
                DELETE FROM cart_items WHERE product_id IN 
                (SELECT id FROM products WHERE category_id = ?)
            `;
            db.query(deleteFromCartQuery, [categoryId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                const deleteFromFavoritesQuery = `
                    DELETE FROM favorites WHERE product_id IN 
                    (SELECT id FROM products WHERE category_id = ?)
                `;
                db.query(deleteFromFavoritesQuery, [categoryId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const deleteProductsQuery = `
                        DELETE FROM products WHERE category_id = ?
                    `;
                    db.query(deleteProductsQuery, [categoryId], (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'All products from this category deleted successfully' });
                    });
                });
            });
        });
    });
};

