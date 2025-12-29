const express = require('express');
const router = express.Router();
const multer = require('multer');

const buildingMaterialCategoryController = require('../controllers/buildingMaterialCategoryController');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get('/', buildingMaterialCategoryController.getAllCategories);
router.get('/:id', buildingMaterialCategoryController.getCategoryById);
router.post('/', upload.single('image'), buildingMaterialCategoryController.createCategory);
router.put('/:id', upload.single('image'), buildingMaterialCategoryController.updateCategory);
router.delete('/:id', buildingMaterialCategoryController.deleteCategory);

module.exports = router;
