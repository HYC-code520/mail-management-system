const { supabaseAdmin } = require('../services/supabase.service');
const { sendTemplateEmail } = require('../services/email.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Smart AI matching using Gemini Vision
 * Extracts text AND intelligently matches to contact list
 */
async function smartMatchWithGemini(req, res, next) {
  try {
    const { image, mimeType, contacts } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Contacts array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-2.5-flash-lite - faster and cheaper, great for clear mail labels!
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite'
    });

    // Build contact list string for Gemini
    const contactListStr = contacts
      .map((c, idx) => {
        const name = c.contact_person || c.company_name || 'Unknown';
        const mailbox = c.mailbox_number || 'N/A';
        return `${idx + 1}. ${name} (Mailbox: ${mailbox})`;
      })
      .join('\n');

    // Smart prompt that asks Gemini to do BOTH extraction AND matching
    const prompt = `You are analyzing a photograph of a mail label or envelope. Your task is to:
1. Find and extract the RECIPIENT'S FULL NAME from the image
2. Match it to one of the customers in the list below

CUSTOMER LIST:
${contactListStr}

INSTRUCTIONS FOR TEXT EXTRACTION:
- Look carefully at the ENTIRE image for the recipient's name
- The name is usually:
  * Near the center or top of the label
  * After keywords like "TO:", "ATTN:", "ATTENTION:", "RECIPIENT:", "DELIVER TO:"
  * The largest or most prominent text
  * Above the address lines
- Extract the COMPLETE name, not just initials or partial text
- Ignore address lines, city names, zip codes, sender information

INSTRUCTIONS FOR MATCHING:
- Compare the extracted name to the customer list
- Handle variations like:
  * First name / last name order (e.g., "Chen Houyu" vs "Houyu Chen")
  * Missing spaces (e.g., "HouYu Chen" vs "Hou Yu Chen")  
  * Partial names (e.g., "H. Chen" → "Houyu Chen")
  * Abbreviations or nicknames
  * Different capitalization

RETURN FORMAT (must be EXACT):
EXTRACTED: [the complete recipient name you found]
MATCHED: [customer number from list, or "NONE" if no match]
CONFIDENCE: [0-100, how confident you are in the match]
REASON: [brief explanation of your match or why no match]

Example response:
EXTRACTED: CHEN HOUYU
MATCHED: 5
CONFIDENCE: 95
REASON: Name matches customer #5 "Houyu Chen", just reversed order (last name first)

Now analyze the image and provide your response:`;

    const imageParts = [
      {
        inlineData: {
          data: image,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ];

    console.log('🤖 Calling Gemini with smart matching...');
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text().trim();

    console.log('📄 Gemini Response:', responseText);

    // Parse Gemini's response
    const extractedMatch = responseText.match(/EXTRACTED:\s*(.+)/i);
    const matchedMatch = responseText.match(/MATCHED:\s*(.+)/i);
    const confidenceMatch = responseText.match(/CONFIDENCE:\s*(\d+)/i);
    const reasonMatch = responseText.match(/REASON:\s*(.+)/i);

    const extractedText = extractedMatch ? extractedMatch[1].trim() : '';
    const matchedIndexStr = matchedMatch ? matchedMatch[1].trim() : 'NONE';
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) / 100 : 0;
    const reason = reasonMatch ? reasonMatch[1].trim() : '';

    // Map matched index to actual contact
    let matchedContact = null;
    if (matchedIndexStr !== 'NONE') {
      const matchedIndex = parseInt(matchedIndexStr, 10);
      if (!isNaN(matchedIndex) && matchedIndex >= 1 && matchedIndex <= contacts.length) {
        matchedContact = contacts[matchedIndex - 1];
      }
    }

    console.log('✅ Smart match result:', {
      extractedText,
      matchedContact: matchedContact?.contact_person || matchedContact?.company_name || null,
      confidence,
      reason,
    });

    res.json({
      extractedText,
      matchedContact,
      confidence,
      reason,
    });
  } catch (error) {
    console.error('❌ Gemini smart matching failed:', error);
    next(error);
  }
}

/**
 * Bulk submit scan session
 * Creates multiple mail items and sends grouped email notifications
 */
async function bulkSubmitScanSession(req, res, next) {
  try {
    const { items } = req.body;
    
    // Get the logged-in user for sending emails
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User authentication required to send notifications' 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Items array is required and must not be empty' 
      });
    }

    // Group items by contact_id
    const groupedByContact = items.reduce((acc, item) => {
      if (!acc[item.contact_id]) {
        acc[item.contact_id] = {
          contact_id: item.contact_id,
          items: [],
          letterCount: 0,
          packageCount: 0,
        };
      }

      acc[item.contact_id].items.push(item);
      
      if (item.item_type === 'Letter') {
        acc[item.contact_id].letterCount++;
      } else {
        acc[item.contact_id].packageCount++;
      }

      return acc;
    }, {});

    const groups = Object.values(groupedByContact);

    // Process each group
    const results = await Promise.all(
      groups.map(async (group) => {
        try {
          // Get contact details
          const { data: contact, error: contactError } = await supabaseAdmin
            .from('contacts')
            .select('contact_id, contact_person, company_name, mailbox_number, email, unit_number')
            .eq('contact_id', group.contact_id)
            .single();

          if (contactError || !contact) {
            throw new Error(`Contact not found: ${group.contact_id}`);
          }

          // Create mail items (bulk insert)
          const mailItemsToInsert = group.items.map(item => ({
            contact_id: item.contact_id,
            item_type: item.item_type,
            quantity: 1,
            received_date: item.scanned_at,
            status: 'Received', // Will be updated to 'Notified' if email succeeds
          }));

          const { data: createdItems, error: insertError } = await supabaseAdmin
            .from('mail_items')
            .insert(mailItemsToInsert)
            .select();

          if (insertError) {
            throw new Error(`Failed to insert mail items: ${insertError.message}`);
          }

          // Select appropriate email template based on item types
          let templateName;
          const hasLetters = group.letterCount > 0;
          const hasPackages = group.packageCount > 0;

          if (hasLetters && hasPackages) {
            templateName = 'Scan: Mixed Items';
          } else if (hasPackages) {
            templateName = 'Scan: Packages Only';
          } else {
            templateName = 'Scan: Letters Only';
          }

          // Get template
          const { data: template, error: templateError } = await supabaseAdmin
            .from('message_templates')
            .select('*')
            .eq('template_name', templateName)
            .single();

          // Send notifications with error handling
          let emailSent = false;
          
          if (templateError || !template) {
            // Fallback to generic notification template
            const { data: fallbackTemplate } = await supabaseAdmin
              .from('message_templates')
              .select('*')
              .eq('template_name', 'New Mail Notification')
              .single();
            
            if (fallbackTemplate) {
              // Build custom type string
              const typeString = [];
              if (group.letterCount > 0) {
                typeString.push(`${group.letterCount} Letter${group.letterCount > 1 ? 's' : ''}`);
              }
              if (group.packageCount > 0) {
                typeString.push(`${group.packageCount} Package${group.packageCount > 1 ? 's' : ''}`);
              }

              // Send notification using fallback template (with error handling)
              try {
                await sendTemplateEmail({
                  to: contact.email,
                  templateSubject: fallbackTemplate.subject_line,
                  templateBody: fallbackTemplate.message_body,
                  variables: {
                    Name: contact.contact_person || contact.company_name || 'Valued Customer',
                    BoxNumber: contact.mailbox_number || 'N/A',
                    Type: typeString.join(' and '),
                    Date: new Date().toLocaleDateString(),
                  },
                  userId: userId, // Use logged-in user for Gmail OAuth!
                });

                // Log notification to history only if email sent successfully
                await supabaseAdmin
                  .from('notification_history')
                  .insert({
                    contact_id: contact.contact_id,
                    mail_item_id: createdItems[0]?.mail_item_id,
                    template_id: fallbackTemplate.template_id,
                    message_type: 'Initial',
                    channel: 'Email',
                    message_content: fallbackTemplate.message_body,
                  });
                
                // Update mail items to "Notified" status
                await supabaseAdmin
                  .from('mail_items')
                  .update({ status: 'Notified' })
                  .in('mail_item_id', createdItems.map(i => i.mail_item_id));
                
                emailSent = true;
              } catch (emailError) {
                console.warn(`⚠️ Failed to send email to ${contact.email}:`, emailError.message);
                // Don't fail the whole process, just log the error
              }
            }
          } else {
            // Send notification using scan-specific template (with error handling)
            try {
              await sendTemplateEmail({
                to: contact.email,
                templateSubject: template.subject_line,
                templateBody: template.message_body,
                variables: {
                  Name: contact.contact_person || contact.company_name || 'Valued Customer',
                  BoxNumber: contact.mailbox_number || 'N/A',
                  LetterCount: group.letterCount,
                  PackageCount: group.packageCount,
                  TotalCount: group.letterCount + group.packageCount,
                  Date: new Date().toLocaleDateString(),
                  // Add pluralization text
                  LetterText: group.letterCount === 1 ? 'letter' : 'letters',
                  PackageText: group.packageCount === 1 ? 'package' : 'packages',
                },
                userId: userId, // Use logged-in user for Gmail OAuth!
              });

              // Log notification to history only if email sent successfully
              await supabaseAdmin
                .from('notification_history')
                .insert({
                  contact_id: contact.contact_id,
                  mail_item_id: createdItems[0]?.mail_item_id,
                  template_id: template.template_id,
                  message_type: 'Initial',
                  channel: 'Email',
                  message_content: template.message_body,
                });
              
              // Update mail items to "Notified" status
              await supabaseAdmin
                .from('mail_items')
                .update({ status: 'Notified' })
                .in('mail_item_id', createdItems.map(i => i.mail_item_id));
              
              emailSent = true;
            } catch (emailError) {
              console.warn(`⚠️ Failed to send email to ${contact.email}:`, emailError.message);
              // Don't fail the whole process, just log the error
            }
          }

          return {
            contact_id: contact.contact_id,
            contact_name: contact.contact_person || contact.company_name,
            letterCount: group.letterCount,
            packageCount: group.packageCount,
            notificationSent: emailSent, // Only true if email actually sent
            itemsCreated: createdItems.length,
          };
        } catch (error) {
          console.error(`Error processing group for contact ${group.contact_id}:`, error);
          return {
            contact_id: group.contact_id,
            contact_name: 'Unknown',
            letterCount: group.letterCount,
            packageCount: group.packageCount,
            notificationSent: false,
            error: error.message,
          };
        }
      })
    );

    // Calculate totals
    const itemsCreated = results.reduce((sum, r) => sum + (r.itemsCreated || 0), 0);
    const notificationsSent = results.filter(r => r.notificationSent).length;
    const errors = results.filter(r => r.error).map(r => r.error);

    res.json({
      success: true,
      itemsCreated,
      notificationsSent,
      summary: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk submit error:', error);
    next(error);
  }
}

module.exports = {
  bulkSubmitScanSession,
  smartMatchWithGemini,
};

