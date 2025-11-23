# 📁 Supabase Migrations

This folder contains the database migration history for the Mail Management System.

---

## ⚠️ Important: Migration Order

Migrations are applied in **chronological order** by timestamp in the filename:

1. `20230530034630_init.sql` - ❌ **DEPRECATED** (Stripe template - not used)
2. `20250122120000_migrate_to_mail_management.sql` - ✅ **CURRENT** (Actual schema)

---

## 📜 Migration History

### `20230530034630_init.sql` (May 30, 2023)
**Status:** ⚠️ **DEPRECATED - DO NOT USE**

- **Origin:** Initial migration from a Stripe SaaS starter template
- **Created:** Stripe billing tables (customers, products, prices, subscriptions)
- **Current Status:** These tables were manually deleted from production
- **Why Keep It:** Already applied to database; Supabase tracks it in migration history
- **Note:** This file is kept ONLY for historical tracking, not for actual use

### `20250122120000_migrate_to_mail_management.sql` (Nov 22, 2025)
**Status:** ✅ **CURRENT SCHEMA**

- **Purpose:** Documents the actual mail management system schema
- **Actions:**
  - Drops unused Stripe tables (safe, idempotent)
  - Creates mail management tables (contacts, mail_items, outreach_messages, message_templates)
  - Sets up Row Level Security (RLS) policies
  - Seeds default bilingual message templates
- **Note:** Production database already has these tables; this migration documents the current state

---

## 📊 Current Production Schema

Your production database contains these tables:

### Core Tables:
- ✅ `users` - User profiles (from auth.users)
- ✅ `contacts` - Customer/client information
- ✅ `mail_items` - Individual mail/package tracking
- ✅ `outreach_messages` - Communication tracking
- ✅ `message_templates` - Reusable bilingual message templates

### Removed Tables (from old Stripe template):
- ❌ `customers` - Deleted
- ❌ `products` - Deleted
- ❌ `prices` - Deleted
- ❌ `subscriptions` - Deleted

---

## 🚀 For New Developers

If you're setting up a new environment:

1. **Skip** `20230530034630_init.sql` (outdated Stripe schema)
2. **Use** `20250122120000_migrate_to_mail_management.sql` to create the correct schema
3. Or use `scripts/simple_reset_rebuild.sql` for local development

---

## 📝 Migration Best Practices

1. ✅ **Never delete applied migrations** (breaks migration tracking)
2. ✅ **Never edit existing migrations** (creates inconsistencies)
3. ✅ **Always create new migrations** for schema changes
4. ✅ **Use timestamps in filenames** for proper ordering (format: `YYYYMMDDHHMMSS_description.sql`)
5. ✅ **Make migrations idempotent** (use `IF EXISTS` / `IF NOT EXISTS`)
6. ✅ **Test migrations locally** before applying to production

---

## 🔗 Related Documentation

- [Migration Guide](../../docs/MIGRATION_GUIDE.md) - How to apply migrations
- [Setup Environment](../../docs/SETUP_ENV.md) - Environment configuration
- [Troubleshooting](../../docs/TROUBLESHOOTING.md) - Common issues

---

## 🆘 Need Help?

- **Applying migrations:** See `docs/MIGRATION_GUIDE.md`
- **Schema questions:** Check `scripts/simple_reset_rebuild.sql` for the canonical schema
- **Production issues:** Check `log.md` for common problems and solutions

---

**Last Updated:** November 22, 2025


