const express = require('express');
const router = express.Router();
const mailItemsController = require('../controllers/mailItems.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/mail-items - Get all mail items (with optional contact_id filter)
router.get('/', mailItemsController.getMailItems);

// POST /api/mail-items - Create a new mail item
router.post('/', mailItemsController.createMailItem);

// PUT /api/mail-items/:id - Update mail item
router.put('/:id', mailItemsController.updateMailItemStatus);

// DELETE /api/mail-items/:id - Delete mail item
router.delete('/:id', mailItemsController.deleteMailItem);

module.exports = router;

