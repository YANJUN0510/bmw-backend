const express = require('express');
const cartController = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth(), cartController.getCart);
router.post('/items', requireAuth(), cartController.addItem);
router.patch('/items/:itemId', requireAuth(), cartController.updateItem);
router.delete('/items/:itemId', requireAuth(), cartController.removeItem);

module.exports = router;
