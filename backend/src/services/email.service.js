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
 * Send email using Gmail API directly (bypasses SMTP blocks)
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.htmlContent - HTML email body
 * @param {string} params.textContent - Plain text fallback
 * @param {string} params.userId - User ID
 * @returns {Promise<Object>} - Send result
 */
async function sendEmailWithGmailApi({ to, subject, htmlContent, textContent, userId }) {
  const oauth2Client = await getValidOAuthClient(userId);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const fromAddress = await getUserGmailAddress(userId);

  // Create email content
  const emailContent = [
    `From: "${process.env.SMTP_FROM_NAME || 'MeiWay Mail Service'}" <${fromAddress}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    htmlContent,
  ].join('\n');

  // Encode email to base64url format
  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send via Gmail API
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  console.log('✅ Email sent via Gmail API:', res.data.id, 'to:', to);
  return { success: true, messageId: res.data.id };
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
        console.log('📧 Attempting to send via Gmail API with OAuth2...');
        return await sendEmailWithGmailApi({ to, subject, htmlContent, textContent, userId });
      } catch (apiError) {
        console.warn('⚠️  Gmail API sending failed, falling back to SMTP:', apiError.message);
        // If OAuth error, re-throw so frontend knows to reconnect
        if (apiError.message.includes('No OAuth tokens found') || 
            apiError.message.includes('invalid_grant') ||
            apiError.message.includes('invalid_client')) {
          throw new Error('Gmail connection expired. Please reconnect Gmail in Settings.');
        }
      }
    }

    // Fall back to SMTP if Gmail API not available
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Email service not configured. Please connect Gmail via OAuth2 or set SMTP credentials.');
    }

    console.log('📧 Using SMTP fallback to send email');
    const fromAddress = process.env.SMTP_USER;

    const info = await smtpTransporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'MeiWay Mail Service'}" <${fromAddress}>`,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Email sent via SMTP:', info.messageId, 'to:', to);
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
    // Support both {{VARIABLE}} and {VARIABLE} formats
    const doubleCurlyPlaceholder = new RegExp(`{{${key}}}`, 'g');
    const singleCurlyPlaceholder = new RegExp(`{${key}}`, 'g');
    
    const value = variables[key] || '';
    subject = subject.replace(doubleCurlyPlaceholder, value);
    subject = subject.replace(singleCurlyPlaceholder, value);
    body = body.replace(doubleCurlyPlaceholder, value);
    body = body.replace(singleCurlyPlaceholder, value);
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

