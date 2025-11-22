# 📋 How to Apply the New Migration

## What We Just Did:

Created a new migration file:
```
supabase/migrations/20250122120000_migrate_to_mail_management.sql
```

This migration:
- ✅ Cleans up unused Stripe tables (safe - uses IF EXISTS)
- ✅ Creates your mail management tables
- ✅ Adds security policies
- ✅ Seeds default templates

## 🚀 How to Apply It:

### Option 1: Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref <your-project-ref>

# Apply the migration
supabase db push
```

### Option 2: Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20250122120000_migrate_to_mail_management.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

### Option 3: Already Applied? (Skip it!)

Since you already manually deleted the Stripe tables and your database is working:
- **You can skip applying this migration to production**
- Keep the file for version control (documents what you did)
- It will be useful if you:
  - Set up a new environment
  - A teammate clones the project
  - You need to restore from backup

## ✅ Verification:

After applying (or if already applied), verify your database has:
- ✅ `contacts` table
- ✅ `mail_items` table
- ✅ `outreach_messages` table
- ✅ `message_templates` table
- ❌ No `customers`, `products`, `prices`, or `subscriptions` tables

## 📌 Important:

The migration is **idempotent** - it's safe to run multiple times. It won't break anything if:
- Tables already exist (uses `IF NOT EXISTS`)
- Tables already deleted (uses `IF EXISTS`)
- Templates already seeded (checks for duplicates)

---

**Need Help?** The migration file has detailed comments explaining each step!


