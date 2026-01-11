const { sendTemplateEmail, sendEmail } = require('../services/email.service');
const { getSupabaseClient } = require('../services/supabase.service');

/**
 * Send email notification using a template and log it
 * POST /api/emails/send
 * Body: { contact_id, mail_item_id?, template_id, message_type?, custom_variables? }
 */
async function sendNotificationEmail(req, res, next) {
  try {
    // Get user-scoped Supabase client (for RLS)
    const supabase = getSupabaseClient(req.user.token);
    
    const {
      contact_id,
      mail_item_id,
      template_id,
      message_type,
      custom_variables
    } = req.body;

    // Validation
    if (!contact_id || !template_id) {
      return res.status(400).json({ 
        error: 'contact_id and template_id are required' 
      });
    }

    // 1. Get contact info
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('email, contact_person, company_name, mailbox_number, language_preference')
      .eq('contact_id', contact_id)
      .single();

    console.log('📧 Contact query result:', { contact, contactError });

    if (contactError || !contact) {
      console.error('❌ Contact not found error:', contactError);
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.email) {
      return res.status(400).json({ error: 'Contact has no email address' });
    }

    // 2. Get template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('template_id', template_id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // 3. Get mail item details if provided
    let mailItemDetails = {};
    let packageFeeDetails = {};
    
    if (mail_item_id) {
      const { data: mailItem } = await supabase
        .from('mail_items')
        .select('*')
        .eq('mail_item_id', mail_item_id)
        .single();
      
      if (mailItem) {
        mailItemDetails = {
          Type: mailItem.item_type || '',
          TRACKING_NUMBER: mailItem.tracking_number || '',
          Date: new Date(mailItem.received_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          QUANTITY: mailItem.quantity || 1,
          STATUS: mailItem.status || ''
        };

        // Fetch package fee information if it's a package
        if (mailItem.item_type === 'Package' || mailItem.item_type === 'Large Package') {
          const { data: packageFee } = await supabase
            .from('package_fees')
            .select('*')
            .eq('mail_item_id', mail_item_id)
            .eq('fee_status', 'pending')
            .single();
          
          if (packageFee) {
            packageFeeDetails = {
              PackageFees: `$${packageFee.fee_amount.toFixed(2)}`,
              PackageFeeAmount: packageFee.fee_amount.toFixed(2),
              DaysCharged: packageFee.days_charged,
              DailyRate: `$${packageFee.daily_rate.toFixed(2)}`,
              GracePeriodDays: packageFee.grace_period_days
            };
          }
        }
      }
    }

    // Get all pending package fees for this contact (for summary emails)
    const { data: allPendingFees } = await supabase
      .from('package_fees')
      .select('*, mail_items!inner(*)')
      .eq('contact_id', contact_id)
      .eq('fee_status', 'pending');
    
    const totalPendingFees = allPendingFees?.reduce((sum, fee) => sum + fee.fee_amount, 0) || 0;
    const packageCount = allPendingFees?.length || 0;

    // 4. Build variables for template substitution
    const variables = {
      Name: contact.contact_person || contact.company_name || 'Customer',
      BoxNumber: contact.mailbox_number || '',
      CONTACT_EMAIL: contact.email || '',
      ...mailItemDetails,
      ...packageFeeDetails,
      // Package fee summary (for all packages for this contact)
      TotalPackageFees: `$${totalPendingFees.toFixed(2)}`,
      TotalPackageFeeAmount: totalPendingFees.toFixed(2),
      PackageCount: packageCount,
      PackagesText: packageCount === 1 ? 'package' : 'packages',
      ...(custom_variables || {}) // Allow custom variables from frontend
    };

    console.log('🔧 Template variables being sent:', variables);
    console.log('📝 Template body:', template.message_body);

    // 5. Send email (with OAuth2 if user has connected Gmail)
    const result = await sendTemplateEmail({
      to: contact.email,
      templateSubject: template.subject_line,
      templateBody: template.message_body,
      variables,
      userId: req.user.id // Pass user ID for OAuth2
    });

    // 6. Log to outreach_messages table
    const { data: outreachMessage, error: logError } = await supabase
      .from('outreach_messages')
      .insert({
        mail_item_id: mail_item_id || null,
        contact_id: contact_id,
        message_type: message_type || template.template_type,
        channel: 'Email',
        message_content: template.message_body,
        sent_at: new Date().toISOString(),
        responded: false,
        follow_up_needed: true
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log outreach message:', logError);
      // Don't fail the request if logging fails
    }

    // 7. Update mail item status to "Notified" if mail_item_id provided
    if (mail_item_id) {
      const { error: updateError } = await supabase
        .from('mail_items')
        .update({ 
          status: 'Notified',
          last_notified: new Date().toISOString()
        })
        .eq('mail_item_id', mail_item_id);

      if (updateError) {
        console.error('Failed to update mail item status:', updateError);
      }

      // 8. Add to notification_history for tracking notification count
      const { error: historyError } = await supabase
        .from('notification_history')
        .insert({
          mail_item_id: mail_item_id,
          contact_id: contact_id,
          notified_by: req.body.sent_by || 'Staff', // Use sent_by which should be "Merlin" or "Madison"
          notification_method: 'Email',
          notified_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Failed to log notification history:', historyError);
        // Don't fail the request if logging fails
      }

      // 9. Add to action_history for action timeline display
      const { error: actionError } = await supabase
        .from('action_history')
        .insert({
          mail_item_id: mail_item_id,
          action_type: 'notified',
          action_description: `Email notification sent via ${template.template_name || template.template_type}`,
          performed_by: req.body.sent_by || 'Staff', // Use sent_by which should be "Merlin" or "Madison"
          notes: `Template: ${template.template_name || template.template_type}`
        });

      if (actionError) {
        console.error('Failed to log action history:', actionError);
        // Don't fail the request if logging fails
      }
    }

    res.json({
      success: true,
      messageId: result.messageId,
      outreachMessage: outreachMessage,
      sentTo: contact.email
    });

  } catch (error) {
    console.error('Send notification email error:', error);
    
    // Check for OAuth2 authentication errors
    if (error.message && (
      error.message.includes('Invalid login') || 
      error.message.includes('No OAuth2 tokens found') ||
      error.message.includes('OAuth2 token') ||
      error.message.includes('invalid_grant')
    )) {
      return res.status(401).json({
        error: 'Gmail disconnected',
        message: 'Your Gmail account is disconnected. Please reconnect in Settings to send emails.',
        code: 'GMAIL_DISCONNECTED',
        action: 'reconnect_gmail'
      });
    }
    
    // Check for email service not configured
    if (error.message && (error.message.includes('Email service not configured') || error.message.includes('Gmail not connected'))) {
      return res.status(503).json({
        error: 'Gmail not connected',
        message: 'Gmail is not connected. Please go to Settings and connect your Gmail account to send emails.',
        code: 'EMAIL_NOT_CONFIGURED',
        action: 'connect_gmail'
      });
    }
    
    next(error);
  }
}

/**
 * Send custom email (no template)
 * POST /api/emails/send-custom
 * Body: { to, subject, body, contact_id?, mail_item_id? }
 */
async function sendCustomEmail(req, res, next) {
  try {
    // Get user-scoped Supabase client (for RLS)
    const supabase = getSupabaseClient(req.user.token);
    
    const { to, subject, body, contact_id, mail_item_id } = req.body;

    // Validation
    if (!to || !subject || !body) {
      return res.status(400).json({ 
        error: 'to, subject, and body are required' 
      });
    }

    // Convert plain text to HTML
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

    // Send email (with OAuth2 if user has connected Gmail)
    const result = await sendEmail({
      to,
      subject,
      htmlContent,
      textContent: body,
      userId: req.user.id // Pass user ID for OAuth2
    });

    // Log to database if contact_id provided
    if (contact_id) {
      const { error: logError } = await supabase
        .from('outreach_messages')
        .insert({
          mail_item_id: mail_item_id || null,
          contact_id: contact_id,
          message_type: 'Custom',
          channel: 'Email',
          message_content: body,
          sent_at: new Date().toISOString(),
          responded: false,
          follow_up_needed: false
        });

      if (logError) {
        console.error('Failed to log custom email:', logError);
      }
    }

    // Update mail item status to "Notified" if mail_item_id provided
    if (mail_item_id) {
      const { error: updateError } = await supabase
        .from('mail_items')
        .update({ 
          status: 'Notified',
          last_notified: new Date().toISOString()
        })
        .eq('mail_item_id', mail_item_id);

      if (updateError) {
        console.error('Failed to update mail item status:', updateError);
      }

      // Add to notification_history for tracking notification count
      const { error: historyError } = await supabase
        .from('notification_history')
        .insert({
          mail_item_id: mail_item_id,
          contact_id: contact_id,
          notified_by: req.body.sent_by || 'Staff', // Use sent_by which should be "Merlin" or "Madison"
          notification_method: 'Email',
          notified_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Failed to log notification history:', historyError);
        // Don't fail the request if logging fails
      }

      // Add to action_history for action timeline display
      const { error: actionError } = await supabase
        .from('action_history')
        .insert({
          mail_item_id: mail_item_id,
          action_type: 'notified',
          action_description: `Custom email sent: ${subject}`,
          performed_by: req.body.sent_by || 'Staff', // Use sent_by which should be "Merlin" or "Madison"
          notes: `Subject: ${subject}`
        });

      if (actionError) {
        console.error('Failed to log action history:', actionError);
        // Don't fail the request if logging fails
      }
    }

    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: to
    });

  } catch (error) {
    console.error('Send custom email error:', error);
    
    // Check for OAuth2 authentication errors
    if (error.message && (
      error.message.includes('Invalid login') || 
      error.message.includes('No OAuth2 tokens found') ||
      error.message.includes('OAuth2 token') ||
      error.message.includes('invalid_grant')
    )) {
      return res.status(401).json({
        error: 'Gmail disconnected',
        message: 'Your Gmail account is disconnected. Please reconnect in Settings to send emails.',
        code: 'GMAIL_DISCONNECTED',
        action: 'reconnect_gmail'
      });
    }
    
    // Check for email service not configured
    if (error.message && (error.message.includes('Email service not configured') || error.message.includes('Gmail not connected'))) {
      return res.status(503).json({
        error: 'Gmail not connected',
        message: 'Gmail is not connected. Please go to Settings and connect your Gmail account to send emails.',
        code: 'EMAIL_NOT_CONFIGURED',
        action: 'connect_gmail'
      });
    }
    
    next(error);
  }
}

/**
 * Test email configuration
 * GET /api/emails/test
 */
async function testEmailConfig(req, res, next) {
  try {
    const testEmail = req.query.to || process.env.SMTP_USER;
    
    if (!testEmail) {
      return res.status(400).json({ 
        error: 'Provide test email as query parameter: ?to=email@example.com' 
      });
    }

    const result = await sendEmail({
      to: testEmail,
      subject: 'Test Email from MeiWay Mail Management System',
      htmlContent: '<h2>✅ Email Service is Working!</h2><p>This is a test email from your mail management system.</p>',
      textContent: '✅ Email Service is Working!\n\nThis is a test email from your mail management system.',
      userId: req.user.id // Pass user ID for OAuth2
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      sentTo: testEmail
    });

  } catch (error) {
    console.error('Test email error:', error);
    
    // Check for OAuth2 authentication errors
    if (error.message && (
      error.message.includes('Invalid login') || 
      error.message.includes('No OAuth2 tokens found') ||
      error.message.includes('OAuth2 token') ||
      error.message.includes('invalid_grant')
    )) {
      return res.status(401).json({
        error: 'Gmail disconnected',
        message: 'Your Gmail account is disconnected. Please reconnect in Settings to send emails.',
        code: 'GMAIL_DISCONNECTED',
        action: 'reconnect_gmail'
      });
    }
    
    // Check for email service not configured
    if (error.message && (error.message.includes('Email service not configured') || error.message.includes('Gmail not connected'))) {
      return res.status(503).json({
        error: 'Gmail not connected',
        message: 'Gmail is not connected. Please go to Settings and connect your Gmail account to send emails.',
        code: 'EMAIL_NOT_CONFIGURED',
        action: 'connect_gmail'
      });
    }
    
    next(error);
  }
}

/**
 * Send bulk notification email for ALL items of a contact
 * POST /api/emails/send-bulk
 * Body: { contact_id, template_id, mail_item_ids: string[] }
 */
async function sendBulkNotification(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { contact_id, template_id, mail_item_ids, sent_by } = req.body;

    // Validation
    if (!contact_id || !template_id || !mail_item_ids || !Array.isArray(mail_item_ids) || mail_item_ids.length === 0) {
      return res.status(400).json({ 
        error: 'contact_id, template_id, and mail_item_ids array are required' 
      });
    }

    // 1. Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_id', contact_id)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.email) {
      return res.status(400).json({ error: 'Contact has no email address' });
    }

    // 2. Fetch template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('template_id', template_id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // 3. Fetch all mail items
    const { data: mailItems, error: itemsError } = await supabase
      .from('mail_items')
      .select('*, package_fees(*)')
      .in('mail_item_id', mail_item_ids);

    if (itemsError) {
      return res.status(500).json({ error: 'Failed to fetch mail items' });
    }

    // 4. Calculate summary statistics
    const packages = mailItems.filter(item => item.item_type === 'Package' || item.item_type === 'Large Package');
    const letters = mailItems.filter(item => item.item_type === 'Letter' || item.item_type === 'Certified Mail');
    
    // Count total items including quantities
    const totalPackages = packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0);
    const totalLetters = letters.reduce((sum, letter) => sum + (letter.quantity || 1), 0);
    const totalItems = totalPackages + totalLetters;
    
    // Calculate oldest item
    const now = new Date();
    const oldestDays = Math.max(...mailItems.map(item => {
      const received = new Date(item.received_date);
      return Math.floor((now - received) / (1000 * 60 * 60 * 24));
    }));

    // Calculate total fees
    const totalFees = packages.reduce((sum, pkg) => {
      const fee = pkg.package_fees?.[0] || pkg.packageFee;
      if (fee && fee.fee_status === 'pending') {
        return sum + (fee.fee_amount || 0);
      }
      return sum;
    }, 0);

    // 5. Build item summary for template
    let itemSummary = '';
    let itemSummaryChinese = '';

    if (totalPackages > 0) {
      itemSummary += `• ${totalPackages} package${totalPackages > 1 ? 's' : ''}`;
      itemSummaryChinese += `• ${totalPackages} 个包裹`;
      if (totalFees > 0) {
        itemSummary += ` (storage fees: $${totalFees.toFixed(2)})`;
        itemSummaryChinese += `（存储费用：$${totalFees.toFixed(2)}）`;
      }
      itemSummary += '\n';
      itemSummaryChinese += '\n';
    }
    if (totalLetters > 0) {
      itemSummary += `• ${totalLetters} letter${totalLetters > 1 ? 's' : ''}`;
      itemSummaryChinese += `• ${totalLetters} 封信件`;
    }

    // Fee summary
    let feeSummary = '';
    let feeSummaryChinese = '';
    if (totalFees > 0) {
      feeSummary = `• Storage fees: $${totalFees.toFixed(2)}`;
      feeSummaryChinese = `• 存储费用：$${totalFees.toFixed(2)}`;
    }

    // 6. Build template variables
    const variables = {
      Name: contact.contact_person || contact.company_name || 'Customer',
      BoxNumber: contact.mailbox_number || '',
      TotalItems: totalItems,
      TotalPackages: totalPackages,
      TotalLetters: totalLetters,
      OldestDays: oldestDays,
      ItemSummary: itemSummary.trim(),
      ItemSummaryChinese: itemSummaryChinese.trim(),
      FeeSummary: feeSummary,
      FeeSummaryChinese: feeSummaryChinese,
      TotalFees: `$${totalFees.toFixed(2)}`
    };

    console.log('📧 Sending bulk notification with variables:', variables);

    // 7. Send the email
    const result = await sendTemplateEmail({
      to: contact.email,
      templateSubject: template.subject_line,
      templateBody: template.message_body,
      variables,
      userId: req.user.id
    });

    // 8. Update ALL mail items to "Notified" status
    const updatePromises = mail_item_ids.map(async (itemId) => {
      return supabase
        .from('mail_items')
        .update({ 
          status: 'Notified',
          last_notified: new Date().toISOString()
        })
        .eq('mail_item_id', itemId);
    });
    await Promise.all(updatePromises);

    // 9. Log outreach message
    await supabase
      .from('outreach_messages')
      .insert({
        mail_item_id: mail_item_ids[0], // Reference first item for the outreach record
        contact_id: contact_id,
        message_type: 'Summary',
        channel: 'Email',
        message_content: template.message_body,
        sent_at: new Date().toISOString(),
        responded: false,
        follow_up_needed: true
      });

    // 10. Record action history for ALL items in the bulk send
    // This ensures each date group shows the bulk notification in its action history
    // Use the same timestamp for all entries to keep them synchronized
    const actionTimestamp = new Date().toISOString();
    const actionHistoryRecords = mail_item_ids.map(itemId => ({
      mail_item_id: itemId,
      action_type: 'bulk_notified',
      action_description: `Summary notification sent (${totalItems} items total)`,
      performed_by: sent_by || 'Staff', // Use sent_by which should be "Merlin" or "Madison"
      notes: `Template: ${template.template_name}, Items: ${totalPackages} packages, ${totalLetters} letters`,
      created_at: actionTimestamp
    }));

    await supabase
      .from('action_history')
      .insert(actionHistoryRecords);

    // 11. Update notification_history for all items (use same timestamp for consistency)
    const notificationRecords = mail_item_ids.map(itemId => ({
      mail_item_id: itemId,
      notification_method: 'Email',
      notified_at: actionTimestamp, // Use same timestamp as action history
      notes: `Summary notification (${totalItems} items)`
    }));

    await supabase
      .from('notification_history')
      .insert(notificationRecords);

    console.log(`✅ Bulk notification sent to ${contact.email} for ${totalItems} items`);

    res.json({
      success: true,
      message: `Summary notification sent for ${totalItems} items`,
      itemsUpdated: totalItems,
      emailSent: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Bulk notification error:', error);
    
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired')) {
      return res.status(401).json({
        error: 'Gmail authentication expired',
        message: 'Your Gmail account is disconnected. Please reconnect in Settings to send emails.',
        code: 'GMAIL_DISCONNECTED',
        action: 'reconnect_gmail'
      });
    }
    
    next(error);
  }
}

module.exports = {
  sendNotificationEmail,
  sendCustomEmail,
  testEmailConfig,
  sendBulkNotification
};

