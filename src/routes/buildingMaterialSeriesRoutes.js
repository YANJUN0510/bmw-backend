const express = require('express');
const router = express.Router();
const multer = require('multer');
const buildingMaterialSeriesController = require('../controllers/buildingMaterialSeriesController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', buildingMaterialSeriesController.getAllSeries);
router.get('/:id', buildingMaterialSeriesController.getSeriesById);
router.post('/', requireAuth(), requireRole(['builder', 'admin']), upload.single('pdf'), buildingMaterialSeriesController.createSeries);
router.put('/:id', requireAuth(), requireRole(['builder', 'admin']), upload.single('pdf'), buildingMaterialSeriesController.updateSeries);
router.delete('/:id', requireAuth(), requireRole(['builder', 'admin']), buildingMaterialSeriesController.deleteSeries);

module.exports = router;
