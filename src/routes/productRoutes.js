const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', productController.getAllProducts);
router.get('/styles', productController.getAllStyles);
router.get('/categories', productController.getAllCategories);
router.get('/:code', productController.getProductByCode);
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), productController.uploadProduct);
router.put('/:code', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), productController.updateProduct);
router.delete('/:code', productController.deleteProduct);

module.exports = router;
