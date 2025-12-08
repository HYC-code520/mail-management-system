-- Add email templates for mobile scan feature
INSERT INTO message_templates (template_name, template_type, subject_line, message_body, default_channel, is_default)
SELECT * FROM (VALUES
    (
        'Scan: Letters Only',
        'Initial',
        'Mail Ready for Pickup - Mei Way Mail Plus',
        'Hello {Name},

You have {LetterCount} letter{LetterCount > 1 ? ''s'' : ''''} ready for pickup at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Date Received: {Date}

Please collect at your earliest convenience during business hours.

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好，

您有 {LetterCount} 封信件在美威邮件中心等待领取。

邮箱号：{BoxNumber}
收件日期：{Date}

请在营业时间内尽快领取。

美威邮件中心',
        'Both',
        FALSE
    ),
    (
        'Scan: Packages Only',
        'Initial',
        'Package Ready for Pickup - Mei Way Mail Plus',
        'Hello {Name},

You have {PackageCount} package{PackageCount > 1 ? ''s'' : ''''} ready for pickup at Mei Way Mail Plus.

Mailbox: {BoxNumber}
Date Received: {Date}

Please bring a valid ID when collecting your package(s).

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好，

您有 {PackageCount} 个包裹在美威邮件中心等待领取。

邮箱号：{BoxNumber}
收件日期：{Date}

领取包裹时请携带有效身份证件。

美威邮件中心',
        'Both',
        FALSE
    ),
    (
        'Scan: Mixed Items',
        'Initial',
        'Mail & Packages Ready - Mei Way Mail Plus',
        'Hello {Name},

You have mail ready for pickup at Mei Way Mail Plus:
• {LetterCount} letter{LetterCount > 1 ? ''s'' : ''''}
• {PackageCount} package{PackageCount > 1 ? ''s'' : ''''}

Mailbox: {BoxNumber}
Date Received: {Date}

Please bring a valid ID when collecting your items.

Best regards,
Mei Way Mail Plus Team

---

{Name} 您好，

您在美威邮件中心有邮件等待领取：
• {LetterCount} 封信件
• {PackageCount} 个包裹

邮箱号：{BoxNumber}
收件日期：{Date}

领取时请携带有效身份证件。

美威邮件中心',
        'Both',
        FALSE
    )
) AS v(template_name, template_type, subject_line, message_body, default_channel, is_default)
WHERE NOT EXISTS (
    SELECT 1 FROM message_templates WHERE template_name = v.template_name
);

