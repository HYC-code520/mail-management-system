-- Quick test to see if sample data loaded
SELECT 'contacts' as table_name, COUNT(*) as count FROM contacts
UNION ALL
SELECT 'mail_items' as table_name, COUNT(*) as count FROM mail_items
UNION ALL
SELECT 'outreach_messages' as table_name, COUNT(*) as count FROM outreach_messages
UNION ALL
SELECT 'message_templates' as table_name, COUNT(*) as count FROM message_templates;

-- Check if there's a user profile
SELECT 'users' as table_name, COUNT(*) as count FROM users;

-- Check auth users
SELECT 'auth_users' as table_name, COUNT(*) as count FROM auth.users;