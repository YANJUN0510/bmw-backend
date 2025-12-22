const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const productRoutes = require('./productRoutes');
const journalRoutes = require('./journalRoutes');
const chatRoutes = require('./chatRoutes');
const messageRoutes = require('./messageRoutes');
const analyticsRoutes = require('./analyticsRoutes');

router.get('/', homeController.getHome);
router.use('/products', productRoutes);
router.use('/journals', journalRoutes);
router.use('/chat', chatRoutes);
router.use('/messages', messageRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
