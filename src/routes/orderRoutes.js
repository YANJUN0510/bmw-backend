const express = require('express');
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth(), orderController.createOrder);
router.get('/', requireAuth(), orderController.getOrders);
router.get('/:orderId', requireAuth(), orderController.getOrderById);
router.patch('/:orderId/status', requireAuth(), orderController.updateOrderStatus);

module.exports = router;
