const express = require('express');
const router = express.Router();
const bmwChatController = require('../controllers/bmwChatController');

router.post('/', bmwChatController.handleBmwChat);

module.exports = router;

