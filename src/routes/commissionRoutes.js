const express = require('express');
const commissionController = require('../controllers/commissionController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get('/ledger', requireAuth(), requireRole(['builder', 'admin']), commissionController.getLedger);
router.post('/adjustments', requireAuth(), requireRole(['admin']), commissionController.createAdjustment);

module.exports = router;
