const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const buildingMaterialRoutes = require('./buildingMaterialRoutes');
const buildingMaterialCategoryRoutes = require('./buildingMaterialCategoryRoutes');
const buildingMaterialSeriesRoutes = require('./buildingMaterialSeriesRoutes');
const bmwChatRoutes = require('./bmwChatRoutes');
const messageRoutes = require('./messageRoutes');
const fileUploadRoutes = require('./fileUploadRoutes');

router.get('/', homeController.getHome);
router.use('/building-materials', buildingMaterialRoutes);
router.use('/building-material-categories', buildingMaterialCategoryRoutes);
router.use('/building-material-series', buildingMaterialSeriesRoutes);
router.use('/bmw/chat', bmwChatRoutes);
router.use('/bmw/upload', fileUploadRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
