const express = require('express');
const router = express.Router();
const fileUploadController = require('../controllers/fileUploadController');

// File upload endpoint
router.post('/', fileUploadController.uploadFile, fileUploadController.handleFileUpload);

// Cleanup endpoint (optional - for maintenance)
router.delete('/cleanup', fileUploadController.cleanupOldFiles);

module.exports = router;