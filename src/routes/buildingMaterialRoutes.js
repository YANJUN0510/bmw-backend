const express = require('express');
const router = express.Router();
const multer = require('multer');
const buildingMaterialController = require('../controllers/buildingMaterialController');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', buildingMaterialController.getAllBuildingMaterials);
router.get('/categories', buildingMaterialController.getAllCategoriesAndSeries);
router.get('/:code', buildingMaterialController.getBuildingMaterialByCode);
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), buildingMaterialController.uploadBuildingMaterial);
router.put('/:code', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), buildingMaterialController.updateBuildingMaterial);
router.delete('/:code', buildingMaterialController.deleteBuildingMaterial);

module.exports = router;
