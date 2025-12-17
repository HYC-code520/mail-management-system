# API Endpoints - Quick Reference

Hey! Here are the API endpoints for testing my Mail Management System. 🚀

---

## 🔗 Base URLs
- **Frontend:** https://mail-management-system-git-develop-mei-ways-projects.vercel.app
- **Backend API:** `https://your-backend-url.com/api` *(replace with your actual backend URL)*

---

## 🔐 Authentication
All endpoints require a JWT token in the header:
```
Authorization: Bearer <JWT_TOKEN>
```
You can get a token by signing in through the frontend app.

---

## 📌 Main Endpoints

### Contacts
```
GET    /api/contacts              # List all contacts
POST   /api/contacts              # Create contact
GET    /api/contacts/:id          # Get single contact
PUT    /api/contacts/:id          # Update contact
DELETE /api/contacts/:id          # Delete contact
```

### Mail Items
```
GET    /api/mail-items            # List mail (optional: ?contact_id=uuid)
POST   /api/mail-items            # Create mail item
PUT    /api/mail-items/:id        # Update mail item
DELETE /api/mail-items/:id        # Delete mail item
```

### Email/Notifications
```
POST   /api/emails/send           # Send template email
POST   /api/emails/send-bulk      # Send bulk summary email
POST   /api/emails/send-custom    # Send custom email
GET    /api/emails/test           # Test email config
```

### Templates
```
GET    /api/templates             # List templates
POST   /api/templates             # Create template
PUT    /api/templates/:id         # Update template
DELETE /api/templates/:id         # Delete template
```

### Action History
```
GET    /api/action-history/:mailItemId    # Get history for mail item
POST   /api/action-history                # Create history entry
POST   /api/action-history/bulk           # Bulk create history
```

### Scan/OCR (AI-powered)
```
POST   /api/scan/bulk-submit      # Submit scanned items
POST   /api/scan/smart-match      # AI match photo to customer
```

### Fees
```
GET    /api/fees                  # List all fees
GET    /api/fees/outstanding      # Outstanding fees
GET    /api/fees/unpaid/:contactId # Unpaid by customer
POST   /api/fees/:feeId/waive     # Waive fee
POST   /api/fees/:feeId/pay       # Mark as paid
POST   /api/fees/recalculate      # Recalculate all fees
```

### Stats
```
GET    /api/stats/dashboard?days=7    # Dashboard stats (7, 14, or 30 days)
```

### Todos
```
GET    /api/todos                 # List todos
POST   /api/todos                 # Create todo
PUT    /api/todos/:id             # Update todo
DELETE /api/todos/:id             # Delete todo
PATCH  /api/todos/bulk            # Bulk update
```

### OAuth (Gmail Integration)
```
GET    /api/oauth/gmail/auth-url      # Get OAuth URL
GET    /api/oauth/gmail/status        # Check connection
POST   /api/oauth/gmail/disconnect    # Disconnect Gmail
```

---

## 🧪 Testing Ideas

**Security:**
- Try requests without auth token (should get 401)
- Invalid/expired tokens
- SQL injection: `'; DROP TABLE--`
- XSS: `<script>alert('test')</script>`

**Validation:**
- Missing required fields
- Invalid UUIDs
- Negative quantities
- Future dates
- Empty arrays

**Rate Limiting:**
- Make 300+ requests in 15 minutes (should get 429)

**Edge Cases:**
- Update non-existent resources (should get 404)
- Delete already deleted items
- Send email to invalid address
- Upload very large images to smart-match
- Concurrent updates to same resource

---

## 📝 Example Request

```bash
# Get all contacts
curl -X GET https://your-api.com/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create mail item
curl -X POST https://your-api.com/api/mail-items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid",
    "item_type": "Letter",
    "received_date": "2025-12-11",
    "quantity": 1,
    "status": "Received"
  }'
```

---

## 📚 Full Documentation
See `API_ENDPOINTS.md` in the repo for complete details, request/response examples, and more.

Let me know if you find any bugs or have questions! 🎯



