const express = require('express');
const adminOrderController = require('../controllers/adminOrderController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get('/export/csv', requireAuth(), requireRole(['builder', 'admin']), adminOrderController.exportOrders);
router.get('/', requireAuth(), requireRole(['builder', 'admin']), adminOrderController.getOrders);
router.get('/:orderId', requireAuth(), requireRole(['builder', 'admin']), adminOrderController.getOrderById);

module.exports = router;
