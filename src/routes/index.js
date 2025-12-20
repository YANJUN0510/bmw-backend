const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const productRoutes = require('./productRoutes');
const journalRoutes = require('./journalRoutes');
const chatRoutes = require('./chatRoutes');

router.get('/', homeController.getHome);
router.use('/products', productRoutes);
router.use('/journals', journalRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
