const express = require('express');
const router = express.Router();

const contactsRoutes = require('./contacts.routes');
const mailItemsRoutes = require('./mailItems.routes');
const outreachMessagesRoutes = require('./outreachMessages.routes');
const templatesRoutes = require('./templates.routes');
const notificationsRoutes = require('./notifications.routes');

router.use('/contacts', contactsRoutes);
router.use('/mail-items', mailItemsRoutes);
router.use('/outreach-messages', outreachMessagesRoutes);
router.use('/messages', outreachMessagesRoutes); // Alias for outreach-messages
router.use('/templates', templatesRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router;

