const db = require('../config/db');

// Отримати всі категорії
exports.getAllCategories = (req, res) => {
    const query = 'SELECT * FROM categories';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Додати категорію
exports.addCategory = (req, res) => {
    const { name } = req.body;
    const query = 'INSERT INTO categories (name) VALUES (?)';
    db.query(query, [name], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Category added successfully' });
    });
};

// Оновити категорію
exports.updateCategory = (req, res) => {
    const { name } = req.body;

    const checkQuery = 'SELECT name FROM categories WHERE id = ?';
    db.query(checkQuery, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0 && results[0].name === 'Невідоме') {
            return res.status(403).json({ error: 'Cannot update the "Невідоме" category' });
        }

        const updateQuery = 'UPDATE categories SET name = ? WHERE id = ?';
        db.query(updateQuery, [name, req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Category updated successfully' });
        });
    });
};

// Видалити категорію
exports.deleteCategory = (req, res) => {

    const checkQuery = 'SELECT name FROM categories WHERE id = ?';
    db.query(checkQuery, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0 && results[0].name === 'Невідоме') {
            return res.status(403).json({ error: 'Cannot delete the "Невідоме" category' });
        }

        const deleteQuery = 'DELETE FROM categories WHERE id = ?';
        db.query(deleteQuery, [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Category deleted successfully' });
        });
    });
};

// Отримати категорію "Невідоме" або створити її, якщо її ще немає
const getOrCreateUnknownCategory = (callback) => {
    const findUnknownQuery = 'SELECT id FROM categories WHERE name = "Невідоме"';
    
    db.query(findUnknownQuery, (err, results) => {
        if (err) return callback(err);

        if (results.length > 0) {
            callback(null, results[0].id);
        } else {
            const createUnknownQuery = 'INSERT INTO categories (name) VALUES ("Невідоме")';
            
            db.query(createUnknownQuery, (err, result) => {
                if (err) return callback(err);
                callback(null, result.insertId); 
            });
        }
    });
};

// Видалення категорії з перенесенням продуктів до категорії "Невідоме"
exports.deleteCategory = (req, res) => {
    const categoryId = req.params.id;

    getOrCreateUnknownCategory((err, unknownCategoryId) => {
        if (err) return res.status(500).json({ error: err.message });

        const updateProductsQuery = 'UPDATE products SET category_id = ? WHERE category_id = ?';
        db.query(updateProductsQuery, [unknownCategoryId, categoryId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const deleteCategoryQuery = 'DELETE FROM categories WHERE id = ?';
            db.query(deleteCategoryQuery, [categoryId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Category deleted and products moved to "Невідоме"' });
            });
        });
    });
};
