const express = require('express');
const router = express.Router();
const multer = require('multer');
const buildingMaterialController = require('../controllers/buildingMaterialController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', buildingMaterialController.getAllBuildingMaterials);
router.get('/categories', buildingMaterialController.getAllCategoriesAndSeries);
router.get('/:code', buildingMaterialController.getBuildingMaterialByCode);
router.post('/', requireAuth(), requireRole(['builder', 'admin']), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), buildingMaterialController.uploadBuildingMaterial);
router.put('/:code', requireAuth(), requireRole(['builder', 'admin']), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), buildingMaterialController.updateBuildingMaterial);
router.delete('/:code', requireAuth(), requireRole(['builder', 'admin']), buildingMaterialController.deleteBuildingMaterial);

module.exports = router;
