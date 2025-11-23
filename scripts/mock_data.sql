-- Mock Data for Mei Way Mail Management System
-- Run this in your Supabase SQL Editor after you've set up your database

-- First, you'll need a user ID. Get your user ID by running:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- Replace 'YOUR_USER_ID_HERE' below with your actual user ID

-- ============================================
-- MOCK CUSTOMERS DATA
-- ============================================

INSERT INTO contacts (
  user_id,
  contact_person,
  company_name,
  email,
  phone,
  mailbox_number,
  unit_number,
  language_preference,
  service_tier,
  customer_type,
  status,
  wechat_id
) VALUES
  -- Customer 1
  (
    'YOUR_USER_ID_HERE',
    'John Smith',
    'Smith Consulting LLC',
    'john.smith@smithconsulting.com',
    '+1 (555) 123-4567',
    'MB-101',
    '101',
    'English',
    2,
    'Business',
    'Active',
    'johnsmith_wx'
  ),
  -- Customer 2
  (
    'YOUR_USER_ID_HERE',
    'Maria Garcia',
    'Garcia Imports',
    'maria@garciaimports.com',
    '+1 (555) 234-5678',
    'MB-102',
    '102',
    'Bilingual',
    3,
    'Business',
    'Active',
    'mariagarcia88'
  ),
  -- Customer 3
  (
    'YOUR_USER_ID_HERE',
    'Wei Chen',
    NULL,
    'wei.chen@email.com',
    '+1 (555) 345-6789',
    'MB-103',
    '103',
    'Chinese',
    1,
    'Individual',
    'Active',
    'weichen2024'
  ),
  -- Customer 4
  (
    'YOUR_USER_ID_HERE',
    'Sarah Johnson',
    'Tech Innovations Inc',
    'sarah.j@techinnovations.com',
    '+1 (555) 456-7890',
    'MB-104',
    '104',
    'English',
    3,
    'Business',
    'Active',
    NULL
  ),
  -- Customer 5
  (
    'YOUR_USER_ID_HERE',
    'David Kim',
    'Kim Real Estate',
    'david@kimrealestate.com',
    '+1 (555) 567-8901',
    'MB-105',
    '105',
    'Bilingual',
    2,
    'Business',
    'Active',
    'davidkim_property'
  ),
  -- Customer 6
  (
    'YOUR_USER_ID_HERE',
    'Lisa Wong',
    NULL,
    'lisa.wong@email.com',
    '+1 (555) 678-9012',
    'MB-106',
    '106',
    'Chinese',
    1,
    'Individual',
    'Pending',
    'lisawong123'
  ),
  -- Customer 7
  (
    'YOUR_USER_ID_HERE',
    'Michael Brown',
    'Brown & Associates',
    'mbrown@brownassociates.com',
    '+1 (555) 789-0123',
    'MB-107',
    '107',
    'English',
    2,
    'Business',
    'Active',
    NULL
  ),
  -- Customer 8
  (
    'YOUR_USER_ID_HERE',
    'Jennifer Lee',
    'Lee Marketing Group',
    'jennifer@leemarketing.com',
    '+1 (555) 890-1234',
    'MB-108',
    '108',
    'Bilingual',
    3,
    'Business',
    'Active',
    'jenniferlee_mktg'
  ),
  -- Customer 9
  (
    'YOUR_USER_ID_HERE',
    'Robert Taylor',
    NULL,
    'robert.taylor@email.com',
    '+1 (555) 901-2345',
    'MB-109',
    '109',
    'English',
    1,
    'Tenant',
    'Active',
    NULL
  ),
  -- Customer 10
  (
    'YOUR_USER_ID_HERE',
    'Amy Zhang',
    'Zhang Trading Co',
    'amy@zhangtrading.com',
    '+1 (555) 012-3456',
    'MB-110',
    '110',
    'Chinese',
    2,
    'Business',
    'Pending',
    'amyzhang_trade'
  );

-- ============================================
-- MOCK MAIL ITEMS DATA
-- ============================================
-- Note: You'll need to replace the contact_id values with actual IDs from your contacts table
-- Run this query first to see your contact IDs:
-- SELECT contact_id, contact_person, company_name FROM contacts;

-- Then insert mail items (example using subqueries to get contact_ids):

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Received',
  'Amazon delivery - small box',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-101'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Notified',
  'USPS certified mail',
  CURRENT_DATE - INTERVAL '1 day',
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-102'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Picked Up',
  'FedEx large package',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE - INTERVAL '1 day'
FROM contacts c
WHERE c.mailbox_number = 'MB-103'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Received',
  'Bank statement',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-104'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Notified',
  'UPS medium box',
  CURRENT_DATE - INTERVAL '1 day',
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-105'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Received',
  'Tax document',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-106'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Received',
  'Amazon Prime delivery',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-107'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Notified',
  'Legal notice',
  CURRENT_DATE - INTERVAL '2 days',
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-108'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Picked Up',
  'DHL international package',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '2 days'
FROM contacts c
WHERE c.mailbox_number = 'MB-109'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Received',
  'Business invoice',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-110'
LIMIT 1;

-- Add more recent mail items for better demo
INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Package',
  'Received',
  'Small envelope from China',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-103'
LIMIT 1;

INSERT INTO mail_items (
  contact_id,
  item_type,
  status,
  description,
  received_date,
  pickup_date
)
SELECT 
  c.contact_id,
  'Letter',
  'Received',
  'Utility bill',
  CURRENT_DATE,
  NULL
FROM contacts c
WHERE c.mailbox_number = 'MB-101'
LIMIT 1;

-- Verify the data
SELECT 
  'Contacts' as table_name,
  COUNT(*) as record_count
FROM contacts
WHERE user_id = 'YOUR_USER_ID_HERE'
UNION ALL
SELECT 
  'Mail Items' as table_name,
  COUNT(*) as record_count
FROM mail_items;




