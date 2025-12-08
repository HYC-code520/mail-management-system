-- Fix pluralization in scan email templates
-- Replace JavaScript ternary operators with proper template variables

UPDATE message_templates
SET message_body = 'Hello {Name},

You have {LetterCount} {LetterText} ready for pickup at Mei Way Mail Plus.

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

美威邮件中心'
WHERE template_name = 'Scan: Letters Only';

UPDATE message_templates
SET message_body = 'Hello {Name},

You have {PackageCount} {PackageText} ready for pickup at Mei Way Mail Plus.

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

美威邮件中心'
WHERE template_name = 'Scan: Packages Only';

UPDATE message_templates
SET message_body = 'Hello {Name},

You have mail ready for pickup at Mei Way Mail Plus:
• {LetterCount} {LetterText}
• {PackageCount} {PackageText}

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

美威邮件中心'
WHERE template_name = 'Scan: Mixed Items';

