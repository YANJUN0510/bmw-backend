const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const productRoutes = require('./productRoutes');
const buildingMaterialRoutes = require('./buildingMaterialRoutes');
const buildingMaterialCategoryRoutes = require('./buildingMaterialCategoryRoutes');
const journalRoutes = require('./journalRoutes');
const chatRoutes = require('./chatRoutes');
const messageRoutes = require('./messageRoutes');

router.get('/', homeController.getHome);
router.use('/products', productRoutes);
router.use('/building-materials', buildingMaterialRoutes);
router.use('/building-material-categories', buildingMaterialCategoryRoutes);
router.use('/journals', journalRoutes);
router.use('/chat', chatRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
