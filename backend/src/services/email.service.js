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
 * Create OAuth2 transporter for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Nodemailer transporter
 */
async function createOAuth2Transporter(userId) {
  const oauth2Client = await getValidOAuthClient(userId);
  const gmailAddress = await getUserGmailAddress(userId);
  const accessToken = oauth2Client.credentials.access_token;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: gmailAddress,
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
  let transporter;
  let fromAddress;

  try {
    // Try OAuth2 first if userId is provided
    if (userId) {
      try {
        transporter = await createOAuth2Transporter(userId);
        fromAddress = await getUserGmailAddress(userId);
        console.log('📧 Using OAuth2 to send email');
      } catch (oauthError) {
        console.warn('⚠️  OAuth2 not available, falling back to SMTP:', oauthError.message);
        transporter = null;
      }
    }

    // Fall back to SMTP if OAuth2 not available
    if (!transporter) {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Email service not configured. Please set SMTP credentials or connect Gmail via OAuth2.');
      }
      transporter = smtpTransporter;
      fromAddress = process.env.SMTP_USER;
      console.log('📧 Using SMTP to send email');
    }

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'MeiWay Mail Service'}" <${fromAddress}>`,
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
  // Replace all {{VARIABLE}} placeholders
  let subject = templateSubject;
  let body = templateBody;
  
  Object.keys(variables).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(placeholder, variables[key] || '');
    body = body.replace(placeholder, variables[key] || '');
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
      </style>
    </head>
    <body>
      <div class="email-container">
        ${body.replace(/\n/g, '<br>')}
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

