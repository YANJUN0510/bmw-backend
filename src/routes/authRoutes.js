const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth(), authController.getMe);

module.exports = router;
