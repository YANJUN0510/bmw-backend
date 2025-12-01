const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', productController.getAllProducts);
router.post('/', upload.single('image'), productController.uploadProduct);
router.put('/:code', upload.single('image'), productController.updateProduct);
router.delete('/:code', productController.deleteProduct);

module.exports = router;
