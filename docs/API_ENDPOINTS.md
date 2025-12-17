# Mei Way Mail Management System - API Endpoints

**Base URL (Production):** `https://your-production-backend-url.com/api`  
**Base URL (Local):** `http://localhost:5000/api`

**Authentication:** All endpoints (except OAuth callback and cron) require a valid Supabase JWT token in the `Authorization` header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 📋 Table of Contents
- [Authentication](#authentication)
- [Contacts](#contacts)
- [Mail Items](#mail-items)
- [Email/Notifications](#emailnotifications)
- [Templates](#templates)
- [Action History](#action-history)
- [Scan/OCR](#scanocr)
- [Fees](#fees)
- [Statistics](#statistics)
- [Todos](#todos)
- [OAuth](#oauth)

---

## 🔐 Authentication

All endpoints require authentication via Supabase JWT token. To get a token:
1. Sign in via the frontend app
2. Token is automatically included in requests from the frontend
3. For manual testing, extract the token from browser localStorage: `supabase.auth.token`

---

## 👥 Contacts

### Get All Contacts
```http
GET /api/contacts
```
**Response:** Array of contact objects

### Get Single Contact
```http
GET /api/contacts/:id
```
**Params:**
- `id` - Contact UUID

### Create Contact
```http
POST /api/contacts
```
**Body:**
```json
{
  "contact_person": "John Doe",
  "company_name": "Acme Corp",
  "mailbox_number": "A123",
  "email": "john@example.com",
  "phone": "+1234567890",
  "wechat": "johndoe",
  "payment_method": "Cash",
  "status": "Yes"
}
```

### Update Contact
```http
PUT /api/contacts/:id
```
**Body:** Same as Create (partial updates allowed)

### Delete Contact
```http
DELETE /api/contacts/:id
```
**Note:** Soft delete (sets status to 'No')

---

## 📬 Mail Items

### Get All Mail Items
```http
GET /api/mail-items
GET /api/mail-items?contact_id=<uuid>
```
**Query Params:**
- `contact_id` (optional) - Filter by contact

### Create Mail Item
```http
POST /api/mail-items
```
**Body:**
```json
{
  "contact_id": "uuid",
  "item_type": "Letter",
  "received_date": "2025-12-11",
  "quantity": 1,
  "status": "Received",
  "notes": "Optional notes"
}
```

### Update Mail Item
```http
PUT /api/mail-items/:id
```
**Body:**
```json
{
  "status": "Picked Up",
  "quantity": 2,
  "performed_by": "Madison"
}
```

### Delete Mail Item
```http
DELETE /api/mail-items/:id
```

---

## 📧 Email/Notifications

### Send Template Email
```http
POST /api/emails/send
```
**Body:**
```json
{
  "contact_id": "uuid",
  "template_id": "uuid",
  "mail_item_id": "uuid (optional)",
  "message_type": "Reminder",
  "custom_variables": {
    "CustomField": "value"
  },
  "sent_by": "Madison"
}
```

### Send Bulk Email (Summary)
```http
POST /api/emails/send-bulk
```
**Body:**
```json
{
  "contact_id": "uuid",
  "template_id": "uuid",
  "mail_item_ids": ["uuid1", "uuid2", "uuid3"],
  "sent_by": "Merlin"
}
```
**Note:** Updates all items to "Notified" and creates consolidated action history

### Send Custom Email
```http
POST /api/emails/send-custom
```
**Body:**
```json
{
  "to": "customer@example.com",
  "subject": "Your mail is ready",
  "body": "Email content here",
  "contact_id": "uuid (optional)",
  "mail_item_id": "uuid (optional)"
}
```

### Test Email Config
```http
GET /api/emails/test
GET /api/emails/test?to=test@example.com
```
**Note:** Sends a test email to verify Gmail integration

---

## 📝 Templates

### Get All Templates
```http
GET /api/templates
```
**Response:** User's custom templates + default system templates

### Create Template
```http
POST /api/templates
```
**Body:**
```json
{
  "template_name": "My Custom Template",
  "template_type": "Reminder",
  "subject_line": "Subject with {Name}",
  "message_body": "Body with {Name}, {BoxNumber}",
  "default_channel": "Email",
  "is_default": false
}
```

### Update Template
```http
PUT /api/templates/:id
```

### Delete Template
```http
DELETE /api/templates/:id
```

---

## 📜 Action History

### Get Action History
```http
GET /api/action-history/:mailItemId
```
**Params:**
- `mailItemId` - Mail item UUID

**Response:** Array of action history entries (changes, emails sent, etc.)

### Create Action History Entry
```http
POST /api/action-history
```
**Body:**
```json
{
  "mail_item_id": "uuid",
  "action": "status_change",
  "description": "Status changed from Received to Notified",
  "performed_by": "Madison",
  "additional_notes": "Optional notes"
}
```

### Bulk Create Action History
```http
POST /api/action-history/bulk
```
**Body:**
```json
{
  "actions": [
    {
      "mail_item_id": "uuid1",
      "action": "bulk_notified",
      "description": "Summary notification sent",
      "performed_by": "Merlin"
    }
  ]
}
```

---

## 📸 Scan/OCR

### Bulk Submit Scan Session
```http
POST /api/scan/bulk-submit
```
**Body:**
```json
{
  "items": [
    {
      "contact_id": "uuid",
      "item_type": "Letter",
      "scanned_at": "2025-12-11T12:00:00Z"
    }
  ]
}
```

### Smart Match (AI)
```http
POST /api/scan/smart-match
```
**Body:**
```json
{
  "image": "base64_encoded_image_data",
  "mimeType": "image/jpeg",
  "contacts": [
    {
      "contact_id": "uuid",
      "contact_person": "John Doe",
      "company_name": "Acme Corp",
      "mailbox_number": "A123"
    }
  ]
}
```
**Response:**
```json
{
  "extractedText": "John Doe",
  "matchedContact": { /* contact object */ },
  "confidence": 0.95,
  "matchReason": "Gemini AI matched: John Doe"
}
```

---

## 💰 Fees

### Get All Fees
```http
GET /api/fees
```

### Get Outstanding Fees
```http
GET /api/fees/outstanding
```

### Get Revenue Stats
```http
GET /api/fees/revenue
GET /api/fees/revenue?startDate=2025-01-01&endDate=2025-12-31
```

### Get Unpaid Fees by Contact
```http
GET /api/fees/unpaid/:contactId
```

### Waive Fee
```http
POST /api/fees/:feeId/waive
```
**Body:**
```json
{
  "reason": "Customer goodwill"
}
```

### Mark Fee as Paid
```http
POST /api/fees/:feeId/pay
```
**Body:**
```json
{
  "paymentMethod": "Cash"
}
```

### Recalculate Fees
```http
POST /api/fees/recalculate
```
**Note:** Manually triggers fee calculation for all pending packages

### Cron Update Fees (No Auth Required)
```http
POST /api/fees/cron/update
```
**Note:** Called by automated cron job daily

---

## 📊 Statistics

### Get Dashboard Stats
```http
GET /api/stats/dashboard
GET /api/stats/dashboard?days=7
GET /api/stats/dashboard?days=30
```
**Query Params:**
- `days` - Time range: 7, 14, or 30 (default: 7)

**Response:**
```json
{
  "todaysMail": {
    "total": 15,
    "letters": 10,
    "packages": 5
  },
  "completedToday": 8,
  "overdueMail": 3,
  "needsFollowup": [
    {
      "contact": { /* contact object */ },
      "packages": [ /* mail items */ ],
      "letters": [ /* mail items */ ],
      "totalFees": 28.00,
      "oldestDays": 66
    }
  ],
  "chartData": [ /* daily breakdown */ ]
}
```

---

## ✅ Todos

### Get All Todos
```http
GET /api/todos
GET /api/todos?date=2025-12-11
GET /api/todos?completed=false
GET /api/todos?category=Work
```
**Query Params:**
- `date` - Filter by date
- `completed` - Filter by completion status
- `category` - Filter by category

### Create Todo
```http
POST /api/todos
```
**Body:**
```json
{
  "title": "Call customer",
  "notes": "Optional notes",
  "date_header": "2025-12-11",
  "priority": 1,
  "category": "Work",
  "staff_member": "Madison"
}
```

### Update Todo
```http
PUT /api/todos/:id
```
**Body:**
```json
{
  "is_completed": true,
  "priority": 2
}
```

### Delete Todo
```http
DELETE /api/todos/:id
```

### Bulk Update Todos
```http
PATCH /api/todos/bulk
```
**Body:**
```json
{
  "todos": [
    {
      "todo_id": "uuid1",
      "sort_order": 1,
      "is_completed": false
    },
    {
      "todo_id": "uuid2",
      "sort_order": 2,
      "is_completed": true
    }
  ]
}
```

---

## 🔗 OAuth (Gmail Integration)

### Get Gmail Auth URL
```http
GET /api/oauth/gmail/auth-url
```
**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### Gmail Callback (No Auth Required)
```http
GET /api/oauth/gmail/callback?code=<auth_code>&state=<user_id>
```
**Note:** Automatically called by Google after user grants permission

### Get Gmail Status
```http
GET /api/oauth/gmail/status
```
**Response:**
```json
{
  "connected": true,
  "email": "your-email@gmail.com"
}
```

### Disconnect Gmail
```http
POST /api/oauth/gmail/disconnect
```

---

## 🧪 Testing Tips for Your Coach

### 1. **Rate Limiting**
The API has rate limiting enabled:
- **300 requests per 15 minutes** per IP address
- Test by making rapid requests to trigger 429 errors

### 2. **Authentication Testing**
- Try requests without `Authorization` header → Should get 401
- Try with invalid token → Should get 401
- Try with expired token → Should get 401

### 3. **Input Validation**
Test with:
- Missing required fields
- Invalid UUIDs
- SQL injection attempts (e.g., `'; DROP TABLE users; --`)
- XSS attempts (e.g., `<script>alert('xss')</script>`)
- Very long strings
- Special characters
- Empty arrays
- Negative numbers for quantities/fees

### 4. **Edge Cases**
- Create mail item with future date
- Update non-existent resources
- Delete already deleted items
- Send email to invalid email addresses
- Upload very large images to smart-match
- Create circular dependencies

### 5. **Concurrent Requests**
- Update same mail item simultaneously from multiple clients
- Process same fee payment multiple times
- Send bulk email while updating individual items

### 6. **Data Integrity**
- Try to delete contact with pending mail items
- Try to create mail item for non-existent contact
- Try to waive already-waived fee

---

## 📝 Example Postman/cURL Commands

### Get All Contacts
```bash
curl -X GET https://your-api.com/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Mail Item
```bash
curl -X POST https://your-api.com/api/mail-items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "item_type": "Letter",
    "received_date": "2025-12-11",
    "quantity": 1,
    "status": "Received"
  }'
```

### Send Bulk Email
```bash
curl -X POST https://your-api.com/api/emails/send-bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "template_id": "template-uuid",
    "mail_item_ids": ["uuid1", "uuid2"],
    "sent_by": "Madison"
  }'
```

---

## 🔒 Security Notes

1. **All user data is scoped** - Users can only access their own data
2. **SQL injection protection** - Using parameterized queries
3. **XSS protection** - Input sanitization on frontend
4. **Rate limiting** - Prevents abuse
5. **JWT authentication** - Secure token-based auth via Supabase
6. **CORS enabled** - Only for trusted origins

---

## 📊 Response Formats

### Success Response
```json
{
  "data": { /* resource data */ },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (successful delete)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not allowed to access)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## 🚀 Live App URL

**Frontend:** `https://your-vercel-app.vercel.app`  
**Backend API:** `https://your-backend-url.com/api`

**Test Credentials:** (If you want to provide test account)
- Email: `test@example.com`
- Password: `TestPassword123`

---

## 📞 Questions?

If you find any bugs or security issues, please report them to:
- Email: your-email@example.com
- GitHub Issues: https://github.com/your-repo/issues

**Good luck with your technical review!** 🎉



