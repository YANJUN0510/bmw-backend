const express = require('express');
const router = express.Router();
const multer = require('multer');

const buildingMaterialCategoryController = require('../controllers/buildingMaterialCategoryController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', buildingMaterialCategoryController.getAllCategories);
router.get('/:id', buildingMaterialCategoryController.getCategoryById);
router.post('/', requireAuth(), requireRole(['builder', 'admin']), upload.single('image'), buildingMaterialCategoryController.createCategory);
router.put('/:id', requireAuth(), requireRole(['builder', 'admin']), upload.single('image'), buildingMaterialCategoryController.updateCategory);
router.delete('/:id', requireAuth(), requireRole(['builder', 'admin']), buildingMaterialCategoryController.deleteCategory);

module.exports = router;
