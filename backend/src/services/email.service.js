const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { getValidOAuthClient, getUserGmailAddress } = require('./oauth2.service');

// Create SMTP transporter (connection to Gmail) - Fallback method
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify connection on startup (only if credentials are provided)
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpTransporter.verify(function(error, success) {
    if (error) {
      console.error('❌ SMTP Connection Error:', error.message);
    } else {
      console.log('✅ Email service (SMTP) ready to send messages');
    }
  });
} else {
  console.warn('⚠️  SMTP not configured - OAuth2 will be used if configured');
}

/**
 * Send email using Gmail API (NOT SMTP)
 * This bypasses the OAuth2 SMTP authentication issues
 * @param {string} userId - User ID
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email body
 * @returns {Promise<Object>} - Send result
 */
async function sendEmailWithGmailApi(userId, to, subject, htmlContent) {
  const oauth2Client = await getValidOAuthClient(userId);
  const gmailAddress = await getUserGmailAddress(userId);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Encode email in RFC 2822 format
  const message = [
    `From: "${process.env.SMTP_FROM_NAME || 'MeiWay Mail Service'}" <${gmailAddress}>`,
    `Reply-To: ${gmailAddress}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlContent
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  console.log('✅ Email sent via Gmail API:', res.data.id, 'to:', to);
  return {
    success: true,
    messageId: res.data.id
  };
}

/**
 * Create OAuth2 transporter for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Nodemailer transporter
 * @deprecated - Use sendEmailWithGmailApi instead
 */
async function createOAuth2Transporter(userId) {
  const oauth2Client = await getValidOAuthClient(userId);
  const gmailAddress = await getUserGmailAddress(userId);
  const accessToken = oauth2Client.credentials.access_token;
  const refreshToken = oauth2Client.credentials.refresh_token;

  console.log('🔑 OAuth2 Debug:', {
    gmailAddress,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    accessTokenLength: accessToken?.length,
    refreshTokenLength: refreshToken?.length
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: gmailAddress,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: refreshToken,
      accessToken: accessToken
    }
  });
}

/**
 * Send email notification to customer
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.htmlContent - HTML email body
 * @param {string} params.textContent - Plain text fallback
 * @param {string} params.userId - User ID (for OAuth2, optional)
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail({ to, subject, htmlContent, textContent, userId }) {
  try {
    // Try Gmail API first if userId is provided
    if (userId) {
      try {
        console.log('📧 Using Gmail API to send email');
        const result = await sendEmailWithGmailApi(userId, to, subject, htmlContent);
        return result;
      } catch (gmailApiError) {
        console.warn('⚠️  Gmail API not available, falling back to SMTP:', gmailApiError.message);
      }
    }

    // Fall back to SMTP if Gmail API not available
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Email service not configured. Please set SMTP credentials or connect Gmail via OAuth2.');
    }
    
    console.log('📧 Using SMTP to send email');
    const info = await smtpTransporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'MeiWay Mail Service'}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Email sent:', info.messageId, 'to:', to);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

/**
 * Send notification using a template with variable substitution
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.templateSubject - Subject with {{variables}}
 * @param {string} params.templateBody - Body with {{variables}}
 * @param {Object} params.variables - Key-value pairs to replace
 * @param {string} params.userId - User ID (for OAuth2, optional)
 * @returns {Promise<Object>}
 */
async function sendTemplateEmail({ to, templateSubject, templateBody, variables, userId }) {
  // Replace all {{VARIABLE}} and {VARIABLE} placeholders
  let subject = templateSubject;
  let body = templateBody;
  
  Object.keys(variables).forEach(key => {
    // Replace both {{VAR}} and {VAR} formats
    const doubleBracePlaceholder = new RegExp(`{{${key}}}`, 'g');
    const singleBracePlaceholder = new RegExp(`{${key}}`, 'g');
    
    subject = subject.replace(doubleBracePlaceholder, variables[key] || '');
    subject = subject.replace(singleBracePlaceholder, variables[key] || '');
    body = body.replace(doubleBracePlaceholder, variables[key] || '');
    body = body.replace(singleBracePlaceholder, variables[key] || '');
  });

  // Convert plain text to HTML (preserve line breaks and add basic styling)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .footer-address { margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${body.replace(/\n/g, '<br>')}
        
        <div class="footer">
          <div class="footer-address">
            <strong>Mei Way Mail Plus</strong><br>
            📍 37-02 Main St b1, Flushing, NY 11354<br>
            📞 (646) 535-0363<br>
            📧 mwmailplus@gmail.com
          </div>
          <p style="margin-top: 10px; font-size: 11px; color: #999;">
            This is an automated notification about your mail. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent: body,
    userId
  });
}

module.exports = {
  sendEmail,
  sendTemplateEmail
};

