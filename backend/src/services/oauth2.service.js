const { google } = require('googleapis');
const { supabaseAdmin } = require('./supabase.service');

/**
 * OAuth2 Service for Gmail Authentication
 * Manages OAuth tokens and Gmail API access
 */

// Create OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth2 authorization URL
 * @param {string} userId - User ID to encode in state
 * @returns {string} - URL to redirect user for authentication
 */
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
    state: userId // Pass user ID in state parameter
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 * @returns {Promise<Object>} - Tokens object
 */
async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Save OAuth tokens to database
 * @param {string} userId - User ID
 * @param {Object} tokens - OAuth tokens
 * @param {string} email - Gmail address
 */
async function saveTokens(userId, tokens, email) {
  const { error } = await supabaseAdmin
    .from('oauth_tokens')
    .upsert({
      user_id: userId,
      gmail_address: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(tokens.expiry_date),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving OAuth tokens:', error);
    throw error;
  }
}

/**
 * Get OAuth tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Tokens object
 */
async function getTokensForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('No OAuth tokens found. Please connect Gmail first.');
  }

  return data;
}

/**
 * Refresh access token if expired
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - OAuth2 client with valid tokens
 */
async function getValidOAuthClient(userId) {
  const tokenData = await getTokensForUser(userId);
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: new Date(tokenData.token_expiry).getTime()
  });

  // Check if token is expired
  const now = Date.now();
  const expiryTime = new Date(tokenData.token_expiry).getTime();

  if (now >= expiryTime - 60000) { // Refresh 1 minute before expiry
    console.log('Access token expired, refreshing...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Save new tokens to database
    await saveTokens(userId, credentials, tokenData.gmail_address);
  }

  return oauth2Client;
}

/**
 * Get user's Gmail address
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Gmail address
 */
async function getUserGmailAddress(userId) {
  const tokenData = await getTokensForUser(userId);
  return tokenData.gmail_address;
}

/**
 * Revoke OAuth tokens (disconnect Gmail)
 * @param {string} userId - User ID
 */
async function revokeTokens(userId) {
  const tokenData = await getTokensForUser(userId);
  const oauth2Client = createOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: tokenData.access_token
  });

  try {
    await oauth2Client.revokeCredentials();
  } catch (error) {
    console.error('Error revoking tokens:', error);
  }

  // Delete from database
  const { error } = await supabaseAdmin
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

/**
 * Check if user has connected Gmail
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function hasGmailConnected(userId) {
  const { data } = await supabaseAdmin
    .from('oauth_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  return !!data;
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  saveTokens,
  getTokensForUser,
  getValidOAuthClient,
  getUserGmailAddress,
  revokeTokens,
  hasGmailConnected
};

