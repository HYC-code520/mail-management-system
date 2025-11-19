-- ##############################################################
-- ##                    SAMPLE DATA FOR MEI WAY CRM        ##
-- ##############################################################
-- Run this AFTER your database schema is set up
-- This provides realistic test data for development and demo

-- ##############################################################
-- ##              1. DEFAULT MESSAGE TEMPLATES              ##
-- ##############################################################

-- Insert default message templates (system-wide)
-- Note: user_id defaults to NULL for system templates, default_channel defaults to 'Email'
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, is_default) VALUES
('Mail Received Notification', 'Initial', 'New Mail Received at Mei Way Mail Plus', 
'Hi {{contact_name}}, 

You have received a {{item_type}} at Mei Way Mail Plus. Your mail is ready for pickup.

📍 Location: Mei Way Mail Plus
⏰ Business Hours: Mon-Fri 9AM-6PM, Sat 10AM-4PM
📞 Contact: (555) 123-4567

Please come by at your earliest convenience to collect your mail.

Thank you!
Mei Way Mail Plus Team', TRUE),

('Pickup Reminder', 'Reminder', 'Reminder: Mail Waiting for Pickup', 
'Hi {{contact_name}},

This is a friendly reminder that you have a {{item_type}} waiting for pickup at Mei Way Mail Plus.

It has been waiting since {{received_date}}. Please collect it at your earliest convenience to avoid any delays.

📍 Location: Mei Way Mail Plus
⏰ Business Hours: Mon-Fri 9AM-6PM, Sat 10AM-4PM
📞 Contact: (555) 123-4567

Thank you!
Mei Way Mail Plus Team', TRUE),

('Pickup Confirmed', 'Confirmation', 'Mail Pickup Confirmed - Thank You!', 
'Hi {{contact_name}},

Thank you for picking up your {{item_type}} today! 

We hope to continue serving your mail forwarding needs. If you have any questions or feedback, please don''t hesitate to reach out.

📞 Contact: (555) 123-4567
📧 Email: info@meiwaymailplus.com

Have a great day!
Mei Way Mail Plus Team', TRUE),

('High Volume Notice', 'Initial', 'Multiple Items Received', 
'Hi {{contact_name}},

You have received multiple mail items at Mei Way Mail Plus today:
{{item_type}}

Due to the volume, please allow extra time when picking up your mail.

📍 Location: Mei Way Mail Plus
⏰ Business Hours: Mon-Fri 9AM-6PM, Sat 10AM-4PM
📞 Contact: (555) 123-4567

Thank you for your patience!
Mei Way Mail Plus Team', TRUE);

-- ##############################################################
-- ##                2. ENSURE USER PROFILE EXISTS           ##
-- ##############################################################

-- Create a user profile if it doesn't exist (in case the trigger didn't run)
INSERT INTO users (id, full_name, avatar_url, billing_address, payment_method)
SELECT id, 'Mei Way Admin', NULL, NULL, NULL 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM users)
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ##############################################################
-- ##                3. SAMPLE CONTACTS                      ##
-- ##############################################################

-- Sample contacts based on typical Mei Way customers
-- Using subquery to automatically get the first user ID from auth.users
INSERT INTO contacts (user_id, company_name, unit_number, contact_person, language_preference, email, phone_number, service_tier, options, mailbox_number, status) VALUES

-- Active customers
((SELECT id FROM auth.users LIMIT 1), 'Zhang Import/Export LLC', 'F14-F15', 'David Zhang', 'English/Mandarin', 'dzhang@zhangimport.com', '(555) 201-3456', 2, 'High Volume', 'D1', 'Active'),

((SELECT id FROM auth.users LIMIT 1), 'Golden Dragon Restaurant', 'F17', 'Lisa Wong', 'English/Mandarin', 'lwong@goldendragon.com', '(555) 201-7890', 1, NULL, 'D2', 'Active'),

((SELECT id FROM auth.users LIMIT 1), 'Pacific Tech Solutions', 'C8', 'Fred Fu', 'English', 'fred.fu@pacifictech.com', '(555) 201-2345', 2, NULL, 'D3', 'Active'),

((SELECT id FROM auth.users LIMIT 1), 'Jade Jewelry Co.', 'B12', 'Angela Chen', 'Mandarin', 'achen@jadejewelry.com', '(555) 201-6789', 1, NULL, 'D4', 'Active'),

((SELECT id FROM auth.users LIMIT 1), 'Rising Sun Trading', 'A5-A6', 'Benjamin Wong', 'English/Mandarin', 'bwong@risingsun.com', '(555) 201-4567', 3, 'High Volume', 'D5', 'Active'),

-- Pending customers
((SELECT id FROM auth.users LIMIT 1), 'New Horizon Consulting', 'E20', 'Sarah Kim', 'English', 'skim@newhorizon.com', '(555) 201-8901', 1, NULL, 'D6', 'PENDING'),

((SELECT id FROM auth.users LIMIT 1), 'Dynasty Imports', 'G3', 'Michael Liu', 'English/Mandarin', 'mliu@dynastyimports.com', '(555) 201-5678', 2, NULL, 'D7', 'PENDING'),

-- Inactive customer
((SELECT id FROM auth.users LIMIT 1), 'Sunset Electronics', 'H15', 'Jenny Tan', 'English', 'jtan@sunsetelec.com', '(555) 201-9012', 1, 'Former customer', 'D8', 'No');

-- ##############################################################
-- ##                4. SAMPLE MAIL ITEMS                    ##
-- ##############################################################

-- Sample mail items for testing (using contact_ids from above)
-- Note: You'll need to replace the contact_id values with actual UUIDs after inserting contacts

-- Recent packages for David Zhang (high volume customer)
INSERT INTO mail_items (contact_id, item_type, description, status, received_date) VALUES
((SELECT contact_id FROM contacts WHERE contact_person = 'David Zhang' LIMIT 1), 'Package', 'Large box from Alibaba shipment', 'Notified', NOW() - INTERVAL '2 hours'),
((SELECT contact_id FROM contacts WHERE contact_person = 'David Zhang' LIMIT 1), 'Certified Mail', 'Legal documents from customs', 'Received', NOW() - INTERVAL '4 hours'),
((SELECT contact_id FROM contacts WHERE contact_person = 'David Zhang' LIMIT 1), 'Package', 'Small electronics shipment', 'Picked Up', NOW() - INTERVAL '1 day');

-- Mail for Lisa Wong
INSERT INTO mail_items (contact_id, item_type, description, status, received_date) VALUES
((SELECT contact_id FROM contacts WHERE contact_person = 'Lisa Wong' LIMIT 1), 'Letter', 'Business correspondence', 'Received', NOW() - INTERVAL '6 hours'),
((SELECT contact_id FROM contacts WHERE contact_person = 'Lisa Wong' LIMIT 1), 'Package', 'Restaurant supplies order', 'Notified', NOW() - INTERVAL '1 hour');

-- Mail for Fred Fu
INSERT INTO mail_items (contact_id, item_type, description, status, received_date) VALUES
((SELECT contact_id FROM contacts WHERE contact_person = 'Fred Fu' LIMIT 1), 'Package', 'Tech equipment delivery', 'Picked Up', NOW() - INTERVAL '2 days'),
((SELECT contact_id FROM contacts WHERE contact_person = 'Fred Fu' LIMIT 1), 'Letter', 'Contract documents', 'Received', NOW() - INTERVAL '3 hours');

-- Mail for Angela Chen
INSERT INTO mail_items (contact_id, item_type, description, status, received_date) VALUES
((SELECT contact_id FROM contacts WHERE contact_person = 'Angela Chen' LIMIT 1), 'Package', 'Jewelry display materials', 'Notified', NOW() - INTERVAL '30 minutes');

-- Mail for Benjamin Wong (high volume)
INSERT INTO mail_items (contact_id, item_type, description, status, received_date) VALUES
((SELECT contact_id FROM contacts WHERE contact_person = 'Benjamin Wong' LIMIT 1), 'Package', 'Trading documents bulk', 'Received', NOW() - INTERVAL '1 hour'),
((SELECT contact_id FROM contacts WHERE contact_person = 'Benjamin Wong' LIMIT 1), 'Certified Mail', 'Government correspondence', 'Received', NOW() - INTERVAL '5 hours');

-- ##############################################################
-- ##              5. SAMPLE OUTREACH MESSAGES               ##
-- ##############################################################

-- Sample outreach messages showing communication history
INSERT INTO outreach_messages (contact_id, mail_item_id, message_type, channel, message_content, responded, follow_up_date, notes) VALUES

-- Successful communication with David Zhang
((SELECT contact_id FROM contacts WHERE contact_person = 'David Zhang' LIMIT 1), 
 (SELECT mail_item_id FROM mail_items WHERE description = 'Large box from Alibaba shipment' LIMIT 1),
 'Initial Notification', 'Email', 
 'Hi David, You have received a Package at Mei Way Mail Plus. Your mail is ready for pickup. Please come by at your earliest convenience.',
 TRUE, NULL, 'Customer responded quickly, will pick up tomorrow'),

-- Pending follow-up with Lisa Wong  
((SELECT contact_id FROM contacts WHERE contact_person = 'Lisa Wong' LIMIT 1),
 (SELECT mail_item_id FROM mail_items WHERE description = 'Restaurant supplies order' LIMIT 1),
 'Initial Notification', 'Email',
 'Hi Lisa, You have received a Package at Mei Way Mail Plus. Your mail is ready for pickup.',
 FALSE, NOW() + INTERVAL '12 hours', 'Need to follow up if no response'),

-- Follow-up reminder for Benjamin Wong
((SELECT contact_id FROM contacts WHERE contact_person = 'Benjamin Wong' LIMIT 1),
 (SELECT mail_item_id FROM mail_items WHERE description = 'Government correspondence' LIMIT 1),
 'Reminder', 'Phone',
 'Called to remind about certified mail pickup. Customer confirmed will pick up this afternoon.',
 TRUE, NULL, 'Successful phone contact, pickup confirmed'),

-- Recent notification to Angela Chen
((SELECT contact_id FROM contacts WHERE contact_person = 'Angela Chen' LIMIT 1),
 (SELECT mail_item_id FROM mail_items WHERE description = 'Jewelry display materials' LIMIT 1),
 'Initial Notification', 'WeChat',
 'Hi Angela, 您有包裹在美威邮政等待取件。You have a package ready for pickup at Mei Way Mail Plus.',
 FALSE, NOW() + INTERVAL '24 hours', 'Sent bilingual message via WeChat');

-- ##############################################################
-- ##                6. VERIFICATION QUERIES                 ##
-- ##############################################################

-- Run these queries to verify your data loaded correctly:

-- Check contacts
-- SELECT company_name, contact_person, status, mailbox_number FROM contacts ORDER BY created_at DESC;

-- Check mail items with contact info
-- SELECT c.contact_person, m.item_type, m.description, m.status, m.received_date 
-- FROM mail_items m 
-- JOIN contacts c ON m.contact_id = c.contact_id 
-- ORDER BY m.received_date DESC;

-- Check outreach messages
-- SELECT c.contact_person, o.message_type, o.channel, o.responded, o.sent_at
-- FROM outreach_messages o
-- JOIN contacts c ON o.contact_id = c.contact_id
-- ORDER BY o.sent_at DESC;

-- Check templates
-- SELECT template_name, template_type, is_default FROM message_templates ORDER BY template_name;

-- Dashboard stats preview
-- SELECT 
--   (SELECT COUNT(*) FROM contacts) as total_contacts,
--   (SELECT COUNT(*) FROM mail_items WHERE status IN ('Received', 'Notified')) as active_mail_items,
--   (SELECT COUNT(*) FROM outreach_messages WHERE follow_up_needed = TRUE AND responded = FALSE) as pending_followups;

-- ##############################################################
-- ##                     USAGE NOTES                        ##
-- ##############################################################

-- 1. AUTOMATIC USER ID: The sample data automatically uses the first user from auth.users
--    No need to manually replace any user IDs - it will work out of the box!
--    
-- 2. This sample data creates a realistic scenario:
--    - 8 contacts (6 active, 2 pending, 1 inactive)
--    - 10 mail items in various statuses
--    - 4 outreach messages showing different communication patterns
--    - 4 default message templates ready to use
--
-- 3. The data includes:
--    - Mixed language preferences (English, Mandarin, both)
--    - Different service tiers (1, 2, 3)
--    - High volume customers with special notes
--    - Realistic business names and contact info
--    - Various mail types (Package, Letter, Certified Mail)
--    - Different communication channels (Email, Phone, WeChat)
--
-- 4. Perfect for testing:
--    - Dashboard statistics
--    - Contact filtering and search
--    - Mail item status updates
--    - Message template usage
--    - Follow-up workflows
--
-- 5. Demo workflow:
--    - Show David Zhang (high volume customer) with multiple items
--    - Demonstrate Lisa Wong notification with pending follow-up
--    - Show Benjamin Wong's successful phone follow-up
--    - Display Angela Chen's bilingual WeChat message