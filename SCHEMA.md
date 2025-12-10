# Database Schema Documentation

## ⚠️ CRITICAL: Always reference this file when writing SQL queries or database code

This document contains the **exact column names** for all tables in the database. Using incorrect column names will cause errors like "column does not exist" or "Contact not found".

---

## `contacts` Table

**Primary Key:** `contact_id` (UUID)

| Column Name | Type | Required | Description | ⚠️ Common Mistakes |
|------------|------|----------|-------------|-------------------|
| `contact_id` | UUID | Yes | Primary key | Don't use `id` |
| `user_id` | UUID | Yes | Foreign key to users | |
| `contact_person` | VARCHAR | No | Individual's name | ❌ NOT `name` |
| `company_name` | VARCHAR | No | Organization name | ❌ NOT `name` |
| `mailbox_number` | VARCHAR | Yes | Mailbox identifier | |
| `unit_number` | VARCHAR | No | Unit/suite number | |
| `email` | VARCHAR | No | Email address | |
| `phone_number` | VARCHAR | No | Phone (format: 917-822-5751) | |
| `wechat` | VARCHAR | No | WeChat ID | |
| `status` | VARCHAR | No | Active/Pending/No | |
| `language_preference` | VARCHAR | No | English/Chinese/Spanish | ❌ NOT `preferred_language` |
| `service_tier` | INTEGER | No | 1/2/3 | |
| `customer_type` | VARCHAR | No | Individual/Business | |
| `subscription_status` | VARCHAR | No | Active/Inactive | |
| `notes` | TEXT | No | Internal notes | |
| `created_at` | TIMESTAMP | Yes | Auto-generated | |

### Important Notes:
- **Customer Name Logic**: Use `contact_person` first, fallback to `company_name` if empty
- **Template Variable**: Map to `{Name}` as `contact_person || company_name || 'Customer'`
- **Language Field**: MUST use `language_preference`, not `preferred_language`

---

## `mail_items` Table

**Primary Key:** `mail_item_id` (UUID)

| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| `mail_item_id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | Foreign key to users |
| `contact_id` | UUID | Yes | Foreign key to contacts |
| `item_type` | VARCHAR | Yes | Letter/Package/Postcard |
| `status` | VARCHAR | Yes | Received/Notified/Picked Up/etc. |
| `received_date` | DATE | Yes | Date mail arrived |
| `pickup_date` | DATE | No | Date picked up |
| `description` | TEXT | No | Notes about item |
| `quantity` | INTEGER | Yes | Number of items (default: 1) |
| `tracking_number` | VARCHAR | No | Tracking/reference number |
| `last_notified` | TIMESTAMP | No | Last notification timestamp |
| `created_at` | TIMESTAMP | Yes | Auto-generated |
| `updated_at` | TIMESTAMP | Yes | Auto-updated |

---

## `message_templates` Table

**Primary Key:** `template_id` (UUID)

| Column Name | Type | Required | Description | Variable Format |
|------------|------|----------|-------------|----------------|
| `template_id` | UUID | Yes | Primary key | |
| `user_id` | UUID | Yes | Foreign key to users | |
| `template_name` | VARCHAR | Yes | Display name | |
| `template_type` | VARCHAR | Yes | Notification/Follow-up/etc. | |
| `subject_line` | VARCHAR | Yes | Email subject | Supports `{VAR}` and `{{VAR}}` |
| `message_body` | TEXT | Yes | Email body | Supports `{VAR}` and `{{VAR}}` |
| `is_active` | BOOLEAN | Yes | Active status (default: true) | |
| `created_at` | TIMESTAMP | Yes | Auto-generated | |
| `updated_at` | TIMESTAMP | Yes | Auto-updated | |

### Template Variables:
All templates support **both** formats:
- Single curly braces: `{Name}`, `{BoxNumber}`, `{Type}`, `{Date}`
- Double curly braces: `{{Name}}`, `{{BoxNumber}}`, `{{Type}}`, `{{Date}}`

**Standard Variables:**
- `{Name}` → `contact_person` or `company_name`
- `{BoxNumber}` → `mailbox_number`
- `{Type}` → `item_type`
- `{Date}` → `received_date` (formatted)

---

## `notification_history` Table

**Primary Key:** `notification_id` (UUID)

| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| `notification_id` | UUID | Yes | Primary key |
| `mail_item_id` | UUID | Yes | Foreign key to mail_items |
| `contact_id` | UUID | Yes | Foreign key to contacts |
| `notified_by` | VARCHAR | Yes | User who sent notification |
| `notification_method` | VARCHAR | Yes | Email/WeChat/Phone/etc. |
| `notified_at` | TIMESTAMP | Yes | When notification was sent |
| `notes` | TEXT | No | Additional notes |

---

## `outreach_messages` Table

**Primary Key:** `message_id` (UUID)

| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| `message_id` | UUID | Yes | Primary key |
| `mail_item_id` | UUID | No | Foreign key to mail_items (optional) |
| `contact_id` | UUID | Yes | Foreign key to contacts |
| `message_type` | VARCHAR | Yes | Notification/Follow-up/etc. |
| `channel` | VARCHAR | Yes | Email/WeChat/Phone |
| `message_content` | TEXT | Yes | Full message text |
| `sent_at` | TIMESTAMP | Yes | When message was sent |
| `responded` | BOOLEAN | Yes | Whether customer responded |
| `follow_up_needed` | BOOLEAN | Yes | Whether follow-up is needed |

---

## `action_history` Table

**Primary Key:** `action_id` (UUID)

| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| `action_id` | UUID | Yes | Primary key |
| `mail_item_id` | UUID | Yes | Foreign key to mail_items |
| `action_type` | VARCHAR | Yes | received/notified/picked_up/etc. |
| `action_description` | TEXT | Yes | Description of action |
| `performed_by` | VARCHAR | Yes | User who performed action |
| `performed_at` | TIMESTAMP | Yes | When action occurred (default: now) |
| `notes` | TEXT | No | Additional context |

---

## `users` Table

**Primary Key:** `user_id` (UUID)

| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| `user_id` | UUID | Yes | Primary key |
| `email` | VARCHAR | Yes | Login email |
| `password_hash` | VARCHAR | Yes | Hashed password |
| `name` | VARCHAR | No | User's full name |
| `role` | VARCHAR | Yes | admin/staff/user |
| `created_at` | TIMESTAMP | Yes | Auto-generated |

---

## `oauth_tokens` Table

**Primary Key:** `token_id` (UUID)

| Column Name | Type | Required | Description |
|------------|------|----------|-------------|
| `token_id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | Foreign key to users |
| `provider` | VARCHAR | Yes | google/outlook/etc. |
| `access_token` | TEXT | Yes | OAuth access token |
| `refresh_token` | TEXT | No | OAuth refresh token |
| `token_expiry` | TIMESTAMP | Yes | When token expires |
| `email` | VARCHAR | No | Provider email address |
| `created_at` | TIMESTAMP | Yes | Auto-generated |
| `updated_at` | TIMESTAMP | Yes | Auto-updated |

---

## `package_fees` Table

**Primary Key:** `fee_id` (UUID)

| Column Name | Type | Required | Description | ⚠️ Business Rules |
|------------|------|----------|-------------|-------------------|
| `fee_id` | UUID | Yes | Primary key | |
| `mail_item_id` | UUID | Yes | Foreign key to mail_items | Must be a Package |
| `contact_id` | UUID | Yes | Foreign key to contacts | |
| `user_id` | UUID | Yes | Foreign key to users | |
| `fee_amount` | DECIMAL(10,2) | Yes | Current fee in dollars | Calculated daily |
| `days_charged` | INTEGER | Yes | Total days since received | Includes grace period |
| `daily_rate` | DECIMAL(10,2) | Yes | Rate per day (default: $2.00) | After grace period |
| `grace_period_days` | INTEGER | Yes | Free days (default: 1) | Day 1 is free |
| `fee_status` | VARCHAR | Yes | pending/paid/waived | Default: pending |
| `paid_date` | TIMESTAMP | No | When customer paid | |
| `payment_method` | VARCHAR | No | cash/card/venmo/zelle | |
| `waived_date` | TIMESTAMP | No | When fee was waived | |
| `waived_by` | UUID | No | User who waived fee | Foreign key to users |
| `waive_reason` | TEXT | No | Why fee was waived | Required when waived |
| `created_at` | TIMESTAMP | Yes | Auto-generated | |
| `updated_at` | TIMESTAMP | Yes | Auto-updated | |
| `last_calculated_at` | TIMESTAMP | Yes | Last fee calculation | Updated by cron |

### Business Rules:
- **Grace Period**: Tier 2 customers get 1-day FREE storage (Day 0 = free, Day 1 = free)
- **Billable Days**: `billable_days = max(0, days_charged - grace_period_days)`
- **Fee Calculation**: `fee_amount = billable_days * daily_rate`
- **Example**: Package received Dec 1 → Dec 3 = 2 days → billable = 2 - 1 = 1 day → fee = $2
- **Abandonment**: Packages 30+ days old are considered abandoned

### Fee Status Values:
- `pending`: Fee is owed, not yet paid
- `paid`: Customer has paid the fee
- `waived`: Fee was forgiven (must have waive_reason)

### Important Notes:
- Fees are automatically created when a Package is logged
- Daily cron job updates `fee_amount` and `days_charged` at 2 AM EST
- Fees are NOT charged for Letters (only Packages)
- Extra-large packages ($5 flat fee) are tracked manually, not in system

---

## Backend Code Guidelines

### When querying `contacts` table:

```javascript
// ✅ CORRECT
const { data: contact } = await supabase
  .from('contacts')
  .select('email, contact_person, company_name, mailbox_number, language_preference')
  .eq('contact_id', contact_id)
  .single();

// ❌ WRONG - will cause "column does not exist" error
const { data: contact } = await supabase
  .from('contacts')
  .select('email, name, mailbox_number, preferred_language')  // WRONG!
  .eq('contact_id', contact_id)
  .single();
```

### When building email variables:

```javascript
// ✅ CORRECT - matches template variables
const variables = {
  Name: contact.contact_person || contact.company_name || 'Customer',  // Maps to {Name}
  BoxNumber: contact.mailbox_number || '',                             // Maps to {BoxNumber}
  Type: mailItem.item_type || '',                                       // Maps to {Type}
  Date: new Date(mailItem.received_date).toLocaleDateString(...)      // Maps to {Date}
};

// ❌ WRONG - templates won't recognize these
const variables = {
  CUSTOMER_NAME: contact.name,           // WRONG! Field doesn't exist
  MAILBOX_NUMBER: contact.mailbox,       // WRONG! Field name
  MAIL_TYPE: mailItem.type               // WRONG! Field name
};
```

---

## Testing Guidelines

### Always test for correct column names:

```javascript
// Test that queries use correct columns
it('should query contact_person not name', () => {
  const selectCall = mockSupabase.select.mock.calls[0][0];
  expect(selectCall).toContain('contact_person');
  expect(selectCall).not.toContain('name');
});

// Test that language_preference is used
it('should query language_preference not preferred_language', () => {
  const selectCall = mockSupabase.select.mock.calls[0][0];
  expect(selectCall).toContain('language_preference');
  expect(selectCall).not.toContain('preferred_language');
});
```

---

## Migration History

### 2025-12-04: Email Template Variable Format
- **Changed**: Email service now supports BOTH `{VAR}` and `{{VAR}}` formats
- **Reason**: Templates in database use single curly braces, backend expected double
- **Impact**: All existing templates work without modification

### 2025-12-04: Contact Name Fields
- **Issue**: Backend was querying non-existent `name` field
- **Fix**: Use `contact_person` (individuals) and `company_name` (organizations)
- **Impact**: "Contact not found" errors resolved

### 2025-12-04: Language Preference Column
- **Issue**: Backend queried `preferred_language` (doesn't exist)
- **Fix**: Use `language_preference` (actual column name)
- **Impact**: Contact queries now work correctly

---

## Quick Reference Card

**Copy this when writing database queries:**

```
✅ USE THESE:
- contact_person (not name)
- company_name (not name)  
- language_preference (not preferred_language)
- mailbox_number
- item_type
- received_date

✅ TEMPLATE VARIABLES:
- {Name} or {{Name}}
- {BoxNumber} or {{BoxNumber}}
- {Type} or {{Type}}
- {Date} or {{Date}}
```





