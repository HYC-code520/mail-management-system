const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const authenticateUser = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

// Get notification history for a mail item
router.get('/mail-item/:mailItemId', notificationsController.getNotificationsByMailItem);

// Get notification history for a contact (customer profile)
router.get('/contact/:contactId', notificationsController.getNotificationsByContact);

// Create a new notification
router.post('/', notificationsController.createNotification);

// Quick notify action (create notification + update status)
router.post('/quick-notify', notificationsController.quickNotify);

module.exports = router;

