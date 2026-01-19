const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get('/', requireAuth(), requireRole(['builder', 'admin']), adminUserController.getUsers);
router.get('/:userId', requireAuth(), requireRole(['builder', 'admin']), adminUserController.getUserById);
router.patch('/:userId', requireAuth(), requireRole(['builder', 'admin']), adminUserController.updateUser);

module.exports = router;
