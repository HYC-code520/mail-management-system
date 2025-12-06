# Input Validation & XSS Protection

**Date**: December 3, 2025  
**Issue**: Security vulnerability - XSS attacks through contact form  
**Reporter**: Technical coach during demo testing

## Problem

During testing, the coach discovered that the contact creation form accepted dangerous input like `<script/>` in name fields. This is a critical security vulnerability that could lead to:
- **Cross-Site Scripting (XSS) attacks**
- **Data integrity issues** (names with random symbols)
- **SQL injection attempts**

### Example Attack
```javascript
contact_person: '<script>alert("xss")</script>'
company_name: '<img src=x onerror=alert(1)>'
```

## Solution

Implemented comprehensive input validation and sanitization on both backend and frontend.

### 1. Backend Validation (`backend/src/utils/validation.js`)

Created a robust validation utility with:

#### Key Features:
- **HTML Tag Removal**: Strips all `<script>`, `<img>`, and other HTML tags
- **Dangerous Character Filtering**: Removes `<>{}[]\/`|~^`
- **Input Sanitization**: Trims whitespace, enforces max lengths
- **Field-Specific Validation**:
  - **Names**: Letters, spaces, hyphens, apostrophes, periods only
  - **Company**: Letters, numbers, &, -, ., ', ,, ()
  - **Email**: Standard email format (RFC-compliant)
  - **Phone**: 10+ digits, allows formatting characters
  - **Unit/Mailbox**: Alphanumeric and hyphens only (no spaces)
  - **WeChat**: Alphanumeric, underscores, hyphens, 6+ chars

#### Validation Rules:

| Field | Min Length | Max Length | Allowed Characters | Required |
|-------|------------|------------|-------------------|----------|
| Contact Person | 2 | 100 | Letters, spaces, -, ', . | Either name or company required |
| Company Name | 2 | 150 | Letters, numbers, spaces, &, -, ', ., ,, () | Either name or company required |
| Email | N/A | 100 | Standard email format | Optional |
| Phone | 10 digits | 20 | Numbers, +, -, (), spaces | Optional |
| Unit/Mailbox | N/A | 20 | Letters, numbers, - | Optional |
| WeChat | 6 | 50 | Letters, numbers, _, - | Optional |
| Notes | N/A | 500 | All characters (sanitized) | Optional |

#### Integration:
```javascript
// backend/src/controllers/contacts.controller.js
const { validateContactData } = require('../utils/validation');

exports.createContact = async (req, res, next) => {
  // Validate and sanitize
  const validation = validateContactData(req.body);
  
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: validation.errors
    });
  }
  
  // Use sanitized data
  const contactData = validation.sanitized;
  // ... insert to database
};
```

### 2. Frontend Validation (`frontend/src/utils/validation.ts`)

Provides instant feedback before backend submission:

#### Features:
- **Real-time validation** as user types
- **User-friendly error messages**
- **Client-side performance** (reduces server load)
- **Consistent rules** with backend

#### Integration:
```typescript
// frontend/src/pages/Contacts.tsx
import { validateContactForm } from '../utils/validation.ts';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate before submitting
  const validation = validateContactForm(formData);
  
  if (!validation.isValid) {
    // Show user-friendly toast messages
    Object.entries(validation.errors).forEach(([field, error]) => {
      toast.error(`${field}: ${error}`);
    });
    return;
  }
  
  // Submit to backend
  await api.contacts.create(formData);
};
```

### 3. Comprehensive Tests

Added 44 new tests for validation (`backend/src/__tests__/validation.test.js`):

✅ **XSS Protection Tests**:
- Rejects `<script>` tags in names
- Rejects `<img>` tags in company names
- Sanitizes HTML from all text fields

✅ **Format Validation Tests**:
- Valid names, companies, emails, phones
- Invalid formats rejected with clear errors

✅ **Edge Cases**:
- Empty fields
- Too short/too long inputs
- Special characters
- Whitespace handling

✅ **Integration Tests**:
- Updated `contacts.test.js` to verify validation in API endpoints
- Added test for XSS rejection in contact creation

### 4. Updated Existing Tests

Modified `backend/src/__tests__/contacts.test.js` to:
- Use valid phone numbers (10+ digits)
- Accept WeChat and customer_type as valid fields
- Test validation rejection for XSS attempts

## Security Benefits

### Before:
```javascript
// ❌ Vulnerable
POST /api/contacts
{
  "contact_person": "<script>alert('xss')</script>"
}
// Would be stored in database and executed in browser!
```

### After:
```javascript
// ✅ Protected
POST /api/contacts
{
  "contact_person": "<script>alert('xss')</script>"
}
// Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": {
    "contact_person": "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
  }
}
```

## Test Results

```
Backend Tests: 107/107 passing (100%) ✅
  - 44 validation tests
  - 5 contact API tests (updated)
  - 58 existing tests (all still passing)

Test Suites: 5 passed
Tests:       107 passed
Time:        3.897s
```

## User Experience

### Frontend Validation:
1. User types invalid input (e.g., `<script>` in name)
2. **Instant feedback**: Toast appears immediately
3. **Clear message**: "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
4. User corrects input
5. Form submits successfully

### Backend Validation (Fallback):
- If frontend validation is bypassed (e.g., API calls)
- Backend validation catches it
- Returns detailed error response
- Frontend displays backend error messages

## Files Changed

### New Files:
- `backend/src/utils/validation.js` - Backend validation utility
- `backend/src/__tests__/validation.test.js` - 44 validation tests
- `frontend/src/utils/validation.ts` - Frontend validation utility

### Modified Files:
- `backend/src/controllers/contacts.controller.js` - Integrated validation
- `backend/src/__tests__/contacts.test.js` - Updated tests
- `frontend/src/pages/Contacts.tsx` - Added frontend validation

## Validation Examples

### ✅ Valid Inputs:
```javascript
{
  contact_person: "John O'Brien",
  company_name: "Smith & Associates, Inc.",
  email: "john@example.com",
  phone_number: "(555) 123-4567",
  unit_number: "A-123",
  wechat: "johndoe_123"
}
```

### ❌ Invalid Inputs:
```javascript
{
  contact_person: "<script>alert('xss')</script>",  // HTML tags
  company_name: "ABC<>Corp",                         // Dangerous chars
  email: "not-an-email",                             // Invalid format
  phone_number: "123",                               // Too short
  unit_number: "A 123",                              // Has spaces
  wechat: "abc"                                      // Too short (<6 chars)
}
```

## Next Steps

- ✅ Backend validation implemented
- ✅ Frontend validation implemented
- ✅ Tests added (107 passing)
- ✅ Documentation complete
- ⏭️ Deploy and test in staging environment
- ⏭️ Monitor for any validation bypass attempts

## Security Note

**This implementation provides strong protection against:**
- XSS (Cross-Site Scripting)
- HTML injection
- Invalid data formats
- Data integrity issues

**However, always remember:**
- Validation is defense-in-depth (multiple layers)
- Backend validation is the final authority
- Frontend validation is for UX only
- Never trust client-side data alone




