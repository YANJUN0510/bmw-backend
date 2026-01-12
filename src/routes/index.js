const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const productRoutes = require('./productRoutes');
const buildingMaterialRoutes = require('./buildingMaterialRoutes');
const buildingMaterialCategoryRoutes = require('./buildingMaterialCategoryRoutes');
const buildingMaterialSeriesRoutes = require('./buildingMaterialSeriesRoutes');
const journalRoutes = require('./journalRoutes');
const chatRoutes = require('./chatRoutes');
const bmwChatRoutes = require('./bmwChatRoutes');
const messageRoutes = require('./messageRoutes');
const authRoutes = require('./authRoutes');
const fileUploadRoutes = require('./fileUploadRoutes');

router.get('/', homeController.getHome);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/building-materials', buildingMaterialRoutes);
router.use('/building-material-categories', buildingMaterialCategoryRoutes);
router.use('/building-material-series', buildingMaterialSeriesRoutes);
router.use('/journals', journalRoutes);
router.use('/chat', chatRoutes);
router.use('/bmw/chat', bmwChatRoutes);
router.use('/bmw/upload', fileUploadRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
