const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);
router.get('/category/:category_id', productController.getProductsByCategory);
router.post('/', authenticateToken, isAdmin, productController.addProduct);
router.put('/:id', authenticateToken, isAdmin, productController.updateProduct);
router.delete('/deleteForCategory/:category_id',authenticateToken,isAdmin,productController.deleteProductsByCategory);
router.delete('/:id', authenticateToken, isAdmin, productController.deleteProduct);



module.exports = router;