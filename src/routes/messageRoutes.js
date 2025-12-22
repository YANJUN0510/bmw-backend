const express = require('express');
const router = express.Router();
const multer = require('multer');
const messageController = require('../controllers/messageController');

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.post('/', upload.array('attachments'), messageController.createMessage);
router.get('/', messageController.getAllMessages);
router.get('/:id', messageController.getMessageById);
router.get('/email/:email', messageController.getMessagesByEmail);
router.get('/phone/:phone', messageController.getMessagesByPhone);
router.patch('/:id/status', messageController.updateMessageStatus);

module.exports = router;
