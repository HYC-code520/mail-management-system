const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templates.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/templates - Get all message templates (user's + defaults)
router.get('/', templatesController.getMessageTemplates);

// POST /api/templates - Create a new message template
router.post('/', templatesController.createMessageTemplate);

// PUT /api/templates/:id - Update a message template
router.put('/:id', templatesController.updateMessageTemplate);

// DELETE /api/templates/:id - Delete a message template
router.delete('/:id', templatesController.deleteMessageTemplate);

module.exports = router;

