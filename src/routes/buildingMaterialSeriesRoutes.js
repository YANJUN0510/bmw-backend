const express = require('express');
const router = express.Router();
const multer = require('multer');
const buildingMaterialSeriesController = require('../controllers/buildingMaterialSeriesController');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', buildingMaterialSeriesController.getAllSeries);
router.get('/:id', buildingMaterialSeriesController.getSeriesById);
router.post('/', upload.single('pdf'), buildingMaterialSeriesController.createSeries);
router.put('/:id', upload.single('pdf'), buildingMaterialSeriesController.updateSeries);
router.delete('/:id', buildingMaterialSeriesController.deleteSeries);

module.exports = router;
