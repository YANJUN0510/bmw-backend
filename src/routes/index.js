const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const productRoutes = require('./productRoutes');

router.get('/', homeController.getHome);
router.use('/products', productRoutes);

module.exports = router;
