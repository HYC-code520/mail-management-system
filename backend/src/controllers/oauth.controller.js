const {
  getAuthUrl,
  getTokensFromCode,
  saveTokens,
  hasGmailConnected,
  getUserGmailAddress,
  revokeTokens
} = require('../services/oauth2.service');
const { google } = require('googleapis');

/**
 * Get OAuth2 authorization URL
 * GET /api/oauth/gmail/auth-url
 */
async function getGmailAuthUrl(req, res, next) {
  try {
    const authUrl = getAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Get auth URL error:', error);
    next(error);
  }
}

/**
 * Handle OAuth2 callback from Google
 * GET /api/oauth/gmail/callback?code=...&state=userId
 */
async function handleGmailCallback(req, res, next) {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!state) {
      return res.status(400).json({ error: 'User state is required' });
    }

    const userId = state; // User ID from state parameter

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user's email address from Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    const gmailAddress = data.email;

    // Save tokens to database
    await saveTokens(userId, tokens, gmailAddress);

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/settings?gmail=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/settings?gmail=error`);
  }
}

/**
 * Get Gmail connection status
 * GET /api/oauth/gmail/status
 */
async function getGmailStatus(req, res, next) {
  try {
    const connected = await hasGmailConnected(req.user.id);
    
    let gmailAddress = null;
    if (connected) {
      gmailAddress = await getUserGmailAddress(req.user.id);
    }

    res.json({
      connected,
      gmailAddress
    });
  } catch (error) {
    console.error('Get Gmail status error:', error);
    next(error);
  }
}

/**
 * Disconnect Gmail (revoke tokens)
 * POST /api/oauth/gmail/disconnect
 */
async function disconnectGmail(req, res, next) {
  try {
    await revokeTokens(req.user.id);
    res.json({
      success: true,
      message: 'Gmail disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect Gmail error:', error);
    next(error);
  }
}

module.exports = {
  getGmailAuthUrl,
  handleGmailCallback,
  getGmailStatus,
  disconnectGmail
};

