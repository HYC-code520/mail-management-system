const express = require('express');
const router = express.Router();
const {
  getGmailAuthUrl,
  handleGmailCallback,
  getGmailStatus,
  disconnectGmail
} = require('../controllers/oauth.controller');
const authenticateUser = require('../middleware/auth.middleware');

/**
 * @route   GET /api/oauth/gmail/auth-url
 * @desc    Get OAuth2 authorization URL for Gmail
 * @access  Private
 */
router.get('/gmail/auth-url', authenticateUser, getGmailAuthUrl);

/**
 * @route   GET /api/oauth/gmail/callback
 * @desc    Handle OAuth2 callback from Google
 * @access  Public (user ID passed via state parameter)
 */
router.get('/gmail/callback', handleGmailCallback);

/**
 * @route   GET /api/oauth/gmail/status
 * @desc    Check if user has connected Gmail
 * @access  Private
 */
router.get('/gmail/status', authenticateUser, getGmailStatus);

/**
 * @route   POST /api/oauth/gmail/disconnect
 * @desc    Disconnect Gmail (revoke OAuth tokens)
 * @access  Private
 */
router.post('/gmail/disconnect', authenticateUser, disconnectGmail);

module.exports = router;

