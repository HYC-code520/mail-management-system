# Email Template Variables

This document lists all available variables that can be used in email templates.

## How to Use

Variables can be used in both **single braces** `{Variable}` or **double braces** `{{Variable}}` format in your email templates.

Example:
```
Hello {Name},

You have {PackageCount} {PackagesText} with outstanding storage fees of {TotalPackageFees}.
```

## Available Variables

### Customer Information
- `{Name}` - Customer's name or company name
- `{BoxNumber}` - Mailbox number
- `{CONTACT_EMAIL}` - Customer's email address

### Mail Item Details (when sending about a specific item)
- `{Type}` - Item type (Letter, Package, Large Package, Certified Mail)
- `{Date}` - Received date (formatted as "Month Day, Year")
- `{QUANTITY}` - Number of items
- `{STATUS}` - Current status
- `{TRACKING_NUMBER}` - Tracking number (if available)

### Package Fee Information (for packages only)

#### Single Package Fees (when mail_item_id is provided)
- `{PackageFees}` - Fee amount with $ sign (e.g., "$5.00")
- `{PackageFeeAmount}` - Fee amount without $ sign (e.g., "5.00")
- `{DaysCharged}` - Number of days charged
- `{DailyRate}` - Daily storage rate with $ sign (e.g., "$2.00")
- `{GracePeriodDays}` - Number of grace period days

#### Summary Fees (all pending packages for the contact)
- `{TotalPackageFees}` - Total fees with $ sign (e.g., "$15.00")
- `{TotalPackageFeeAmount}` - Total fees without $ sign (e.g., "15.00")
- `{PackageCount}` - Number of packages with fees
- `{PackagesText}` - "package" or "packages" (auto-pluralized)

## Example Templates

### Package Fee Reminder
```
Subject: Package Storage Fee Notice - {BoxNumber}

Hello {Name},

You currently have {PackageCount} {PackagesText} awaiting pickup with storage fees:

Total Outstanding Fees: {TotalPackageFees}

Please collect your packages at your earliest convenience during business hours.

Mailbox: {BoxNumber}

Best regards,
Mei Way Mail Plus Team
```

### Single Package Notification with Fee
```
Subject: Package Ready - Storage Fee Applies

Hello {Name},

Your {Type} received on {Date} is ready for pickup.

Storage Fee: {PackageFees} ({DaysCharged} days at {DailyRate}/day)
Grace Period: {GracePeriodDays} days

Mailbox: {BoxNumber}

Best regards,
Mei Way Mail Plus Team
```

### Bilingual Template with Fees
```
Hello {Name},

You have {PackageCount} {PackagesText} with outstanding storage fees of {TotalPackageFees}.

Please collect at your earliest convenience during business hours.

---

{Name} 您好，

您有 {PackageCount} 个包裹，存储费用为 {TotalPackageFees}。

请在营业时间内尽快领取。

Best regards,
Mei Way Mail Plus Team
```

## Notes

- Fee variables are only populated for **Package** and **Large Package** items
- Summary variables (`TotalPackageFees`, `PackageCount`) show all pending fees for the contact
- Single package variables (`PackageFees`, `DaysCharged`) are only available when a specific `mail_item_id` is provided
- If no fees exist, fee variables will be empty strings
- Use `{PackagesText}` for automatic pluralization ("1 package" vs "2 packages")

