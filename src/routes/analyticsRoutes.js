const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get('/overview', requireAuth(), requireRole(['builder', 'admin']), analyticsController.getOverview);

module.exports = router;
