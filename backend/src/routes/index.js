const express = require('express');
const router = express.Router();

const contactsRoutes = require('./contacts.routes');
const mailItemsRoutes = require('./mailItems.routes');
const outreachMessagesRoutes = require('./outreachMessages.routes');
const templatesRoutes = require('./templates.routes');
const notificationsRoutes = require('./notifications.routes');
const actionHistoryRoutes = require('./actionHistory.routes');
const emailRoutes = require('./email.routes');
const oauthRoutes = require('./oauth.routes');
const todosRoutes = require('./todos.routes');
const scanRoutes = require('./scan.routes');
const ocrRoutes = require('./ocr.routes');

router.use('/contacts', contactsRoutes);
router.use('/mail-items', mailItemsRoutes);
router.use('/outreach-messages', outreachMessagesRoutes);
router.use('/messages', outreachMessagesRoutes); // Alias for outreach-messages
router.use('/templates', templatesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/action-history', actionHistoryRoutes);
router.use('/emails', emailRoutes);
router.use('/oauth', oauthRoutes);
router.use('/todos', todosRoutes);
router.use('/scan', scanRoutes);
router.use('/ocr', ocrRoutes);

module.exports = router;

