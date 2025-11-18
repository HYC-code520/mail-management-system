-- ##############################################################
-- ##           SIMPLE DATABASE RESET AND REBUILD            ##
-- ##############################################################
-- This script uses a simpler, more reliable approach to reset and rebuild

-- ##############################################################
-- ##                    STEP 1: SIMPLE RESET                ##
-- ##############################################################

-- Drop specific tables in reverse dependency order
DROP TABLE IF EXISTS outreach_messages CASCADE;
DROP TABLE IF EXISTS mail_items CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS pricing_plan_interval CASCADE;
DROP TYPE IF EXISTS pricing_type CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop publication
DROP PUBLICATION IF EXISTS supabase_realtime;

-- ##############################################################
-- ##                    STEP 2: CREATE TYPES                ##
-- ##############################################################

CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
CREATE TYPE pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');

-- ##############################################################
-- ##                 STEP 3: CREATE FOUNDATION TABLES       ##
-- ##############################################################

-- Users table (core user profiles)
CREATE TABLE users (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb
);

-- Customers table (Stripe integration)
CREATE TABLE customers (
  id uuid references auth.users not null primary key,
  stripe_customer_id text
);

-- Products table (Stripe products)
CREATE TABLE products (
  id text primary key,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb
);

-- Prices table (Stripe pricing)
CREATE TABLE prices (
  id text primary key,
  product_id text references products, 
  active boolean,
  description text,
  unit_amount bigint,
  currency text check (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb
);

-- Subscriptions table (Stripe subscriptions)
CREATE TABLE subscriptions (
  id text primary key,
  user_id uuid references auth.users not null,
  status subscription_status,
  metadata jsonb,
  price_id text references prices,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamp with time zone default timezone('utc'::text, now()) not null,
  current_period_start timestamp with time zone default timezone('utc'::text, now()) not null,
  current_period_end timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone default timezone('utc'::text, now()),
  cancel_at timestamp with time zone default timezone('utc'::text, now()),
  canceled_at timestamp with time zone default timezone('utc'::text, now()),
  trial_start timestamp with time zone default timezone('utc'::text, now()),
  trial_end timestamp with time zone default timezone('utc'::text, now())
);

-- ##############################################################
-- ##                   STEP 4: CREATE CRM TABLES            ##
-- ##############################################################

-- Contacts table (customer/client information)
CREATE TABLE contacts (
    contact_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name        TEXT,
    unit_number         TEXT,  -- Mailbox/Unit identifier (e.g., F14-F15, F17, C8)
    contact_person      TEXT,  -- Primary contact name
    language_preference TEXT,  -- e.g., English, Mandarin, English/Mandarin
    email               TEXT,
    phone_number        TEXT,
    service_tier        INTEGER, -- 1, 2, etc.
    options             TEXT,  -- Special notes like "*High Volume"
    mailbox_number      TEXT,  -- Physical mailbox assignment (e.g., D1, D2, D3)
    status              TEXT DEFAULT 'PENDING', -- Active, PENDING, No
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Mail items table (individual mail/package tracking)
CREATE TABLE mail_items (
    mail_item_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id          UUID REFERENCES contacts(contact_id) ON DELETE CASCADE,
    item_type           TEXT DEFAULT 'Package', -- Package, Letter, Certified Mail, etc.
    description         TEXT, -- Brief note about the item
    received_date       TIMESTAMPTZ DEFAULT NOW(),
    status              TEXT DEFAULT 'Received', -- Received, Notified, Picked Up, Returned
    pickup_date         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach messages table (communication tracking)
CREATE TABLE outreach_messages (
    message_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_item_id        UUID REFERENCES mail_items(mail_item_id) ON DELETE CASCADE,
    contact_id          UUID REFERENCES contacts(contact_id) ON DELETE CASCADE,
    message_type        TEXT, -- Initial Notification, Reminder, Pickup Confirmed
    channel             TEXT, -- Email, SMS, WeChat, Phone
    message_content     TEXT, -- The actual message sent
    sent_at             TIMESTAMPTZ DEFAULT NOW(),
    responded           BOOLEAN NOT NULL DEFAULT FALSE,
    response_date       TIMESTAMPTZ,
    follow_up_needed    BOOLEAN DEFAULT TRUE,
    follow_up_date      TIMESTAMPTZ, -- Auto-set to 24-48h after sent_at
    notes               TEXT
);

-- Message templates table (reusable message templates)
CREATE TABLE message_templates (
    template_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    template_name       TEXT NOT NULL, -- e.g., "Mail Received", "Pickup Reminder", "Pickup Confirmed"
    template_type       TEXT NOT NULL, -- Initial, Reminder, Confirmation, Custom
    subject_line        TEXT, -- For emails
    message_body        TEXT NOT NULL, -- Can include {{variables}} like {{contact_name}}, {{item_type}}
    default_channel     TEXT DEFAULT 'Email', -- Email, SMS, Both
    is_default          BOOLEAN DEFAULT FALSE, -- System default templates
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ##############################################################
-- ##                  STEP 5: ENABLE ROW LEVEL SECURITY     ##
-- ##############################################################

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ##############################################################
-- ##                    STEP 6: CREATE POLICIES             ##
-- ##############################################################

-- Users policies
CREATE POLICY "Can view own user data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Can update own user data." ON users FOR UPDATE USING (auth.uid() = id);

-- Products policies (public read-only for pricing display)
CREATE POLICY "Allow public read-only access." ON products FOR SELECT USING (true);

-- Prices policies (public read-only for pricing display)
CREATE POLICY "Allow public read-only access." ON prices FOR SELECT USING (true);

-- Subscriptions policies
CREATE POLICY "Can only view own subs data." ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Contacts policies (users can only manage their own contacts)
CREATE POLICY "Users can manage their own contacts." ON contacts
    FOR ALL USING (auth.uid() = user_id);

-- Mail items policies (users can only manage mail for their contacts)
CREATE POLICY "Users can manage mail items for their contacts." ON mail_items
    FOR ALL USING (auth.uid() = (SELECT user_id FROM contacts WHERE contacts.contact_id = mail_items.contact_id));

-- Outreach messages policies (users can only manage outreach for their contacts)
CREATE POLICY "Users can manage outreach for their contacts." ON outreach_messages
    FOR ALL USING (auth.uid() = (SELECT contacts.user_id FROM contacts WHERE contacts.contact_id = outreach_messages.contact_id));

-- Message templates policies (users can manage their own templates + see defaults)
CREATE POLICY "Users can manage their templates." ON message_templates
    FOR ALL USING (auth.uid() = user_id OR is_default = TRUE);

-- ##############################################################
-- ##                STEP 7: CREATE FUNCTIONS & TRIGGERS     ##
-- ##############################################################

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ##############################################################
-- ##               STEP 8: SETUP REALTIME                   ##
-- ##############################################################

-- Create publication for realtime subscriptions (for live updates)
CREATE PUBLICATION supabase_realtime FOR TABLE products, prices, contacts, mail_items, outreach_messages, message_templates;

-- ##############################################################
-- ##                STEP 9: INSERT DEFAULT DATA             ##
-- ##############################################################

-- Insert some default message templates for immediate use
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, is_default) VALUES
('Mail Received Notification', 'Initial', 'New Mail Received', 'Hi {{contact_name}}, you have received a {{item_type}} at our facility. Please contact us to arrange pickup.', true),
('Pickup Reminder', 'Reminder', 'Mail Pickup Reminder', 'Hi {{contact_name}}, you have a {{item_type}} waiting for pickup. Please collect it at your earliest convenience.', true),
('Pickup Confirmed', 'Confirmation', 'Mail Pickup Confirmed', 'Hi {{contact_name}}, your {{item_type}} has been successfully picked up. Thank you!', true);

-- ##############################################################
-- ##                     COMPLETE!                          ##
-- ##############################################################

-- Database has been completely reset and rebuilt with:
-- ✅ All foundation tables (users, customers, products, prices, subscriptions)
-- ✅ All CRM tables (contacts, mail_items, outreach_messages, message_templates)
-- ✅ Row-level security enabled on all tables
-- ✅ Proper security policies for multi-tenant data isolation
-- ✅ Automatic user profile creation on signup
-- ✅ Realtime subscriptions for live updates
-- ✅ Default message templates ready to use
-- ✅ Foreign key relationships and data integrity constraints