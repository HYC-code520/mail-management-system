-- Script to reassign sample data to current logged-in user
-- Run this after signing in to your account

-- First, check what users exist
SELECT 'auth_users' as table_name, email, id FROM auth.users;
SELECT 'users_profiles' as table_name, full_name, id FROM users;

-- Check current contacts and their user_ids
SELECT 'current_contacts' as info, contact_person, user_id FROM contacts LIMIT 5;

-- Update all sample data to use the first auth user
-- (This will be your current logged-in user)
UPDATE contacts 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id != (SELECT id FROM auth.users LIMIT 1);

-- Verify the update worked
SELECT 'updated_contacts' as info, contact_person, user_id FROM contacts LIMIT 5;