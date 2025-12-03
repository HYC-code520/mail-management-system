const express = require('express');
const router = express.Router();
const { 
  sendNotificationEmail, 
  sendCustomEmail,
  testEmailConfig 
} = require('../controllers/email.controller');
const authenticateUser = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   POST /api/emails/send
 * @desc    Send email using a template with variable substitution
 * @access  Private
 * @body    { contact_id, template_id, mail_item_id?, message_type?, custom_variables? }
 */
router.post('/send', sendNotificationEmail);

/**
 * @route   POST /api/emails/send-custom
 * @desc    Send custom email without template
 * @access  Private
 * @body    { to, subject, body, contact_id?, mail_item_id? }
 */
router.post('/send-custom', sendCustomEmail);

/**
 * @route   GET /api/emails/test
 * @desc    Test email configuration
 * @access  Private
 * @query   ?to=email@example.com
 */
router.get('/test', testEmailConfig);

module.exports = router;

