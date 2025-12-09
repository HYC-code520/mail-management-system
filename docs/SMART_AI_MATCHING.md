# Smart AI Matching Implementation

## Overview

The Smart AI Matching feature uses **Google Gemini 1.5 Flash** (FREE tier) to perform **BOTH** text extraction AND intelligent contact matching in a single API call. This handles complex edge cases that traditional OCR + fuzzy matching cannot.

## Architecture

### Flow Diagram

```
┌─────────────┐
│ User scans  │
│   mail      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Frontend: ScanSession.tsx           │
│                                     │
│ 1. Capture photo                    │
│ 2. Call smartMatchWithGemini()      │
└──────────┬──────────────────────────┘
           │ (sends photo + contact list)
           ▼
┌─────────────────────────────────────┐
│ Backend: scan.controller.js         │
│                                     │
│ 1. Receive photo + contacts         │
│ 2. Build prompt for Gemini          │
│ 3. Call Gemini Vision API           │
│ 4. Parse structured response        │
│ 5. Map match to actual contact      │
└──────────┬──────────────────────────┘
           │ (returns match result)
           ▼
┌─────────────────────────────────────┐
│ Frontend: Display match             │
│                                     │
│ - Show matched contact              │
│ - Show confidence %                 │
│ - Allow user to confirm/edit        │
└─────────────────────────────────────┘
```

## Features

### What It Handles

✅ **Name Order Variations**
- "Houyu Chen" ↔ "Chen Houyu"
- First name first vs. last name first

✅ **Spacing Issues**
- "HouYu Chen" → "Houyu Chen"
- "Hou Yu Chen" → "Houyu Chen"
- Missing spaces or extra spaces

✅ **Abbreviations**
- "H. Chen" → "Houyu Chen"
- "J. Doe" → "John Doe"

✅ **Nicknames & Variations**
- "Bob" → "Robert Johnson"
- "Mike" → "Michael Smith"

✅ **Context Understanding**
- Distinguishes recipient name from address
- Ignores company names if looking for person
- Handles stylized fonts and handwriting

## Implementation Details

### Frontend: `smartMatch.ts`

```typescript
smartMatchWithGemini(photoBlob, contacts)
  → Returns: { extractedText, matchedContact, confidence, reason }
```

- Converts photo to base64
- Sends to backend API with contact list
- Returns structured match result

### Backend: `scan.controller.js`

```javascript
smartMatchWithGemini(req, res, next)
  ← Receives: { image, mimeType, contacts }
  → Returns: { extractedText, matchedContact, confidence, reason }
```

**Prompt Strategy:**
1. Give Gemini the full contact list (numbered)
2. Ask it to extract text AND match to a customer
3. Request structured response format:
   ```
   EXTRACTED: [exact text seen]
   MATCHED: [customer number or NONE]
   CONFIDENCE: [0-100]
   REASON: [explanation]
   ```

**Response Parsing:**
- Uses regex to extract each field
- Maps customer number back to actual contact object
- Returns structured result to frontend

### Integration: `ScanSession.tsx`

```typescript
processPhoto(photoBlob)
  1. Try smart AI matching first (Gemini)
  2. If confidence < 70%, fallback to Tesseract + fuzzy match
  3. Use best result
```

**Why This Order?**
- Gemini is SMART but requires API call (slight delay)
- If Gemini works well (>70% confidence), we're done!
- If not, we still have fallback (Tesseract + Fuse.js)

## API Endpoints

### `POST /api/scan/smart-match`

**Request:**
```json
{
  "image": "base64_encoded_image_data",
  "mimeType": "image/jpeg",
  "contacts": [
    {
      "contact_id": "1",
      "contact_person": "Houyu Chen",
      "company_name": null,
      "mailbox_number": "105"
    },
    ...
  ]
}
```

**Response:**
```json
{
  "extractedText": "CHEN HOUYU",
  "matchedContact": {
    "contact_id": "1",
    "contact_person": "Houyu Chen",
    "mailbox_number": "105"
  },
  "confidence": 0.95,
  "reason": "Name matches customer #1, just reversed order (last name first)"
}
```

## Cost & Performance

### Gemini 1.5 Flash (FREE Tier)

- **Rate Limits:**
  - 15 requests per minute
  - 1500 requests per day
  - 1 million tokens per day

- **Cost:**
  - FREE up to rate limits
  - After: $0.075 per 1M input tokens
  - After: $0.30 per 1M output tokens

- **Performance:**
  - ~1-2 seconds per image
  - Faster than Tesseract for complex images
  - Slower than Tesseract for simple clear text

### Typical Usage

For a 50-mailbox facility:
- ~10-20 scans per day average
- ~100 scans per day max (busy day)
- **Well within FREE tier limits!**

## Edge Cases Handled

### Test Cases

| Input | Expected Match | Handled? |
|-------|---------------|----------|
| "CHEN HOUYU" | Houyu Chen | ✅ Yes |
| "HouYu Chen" | Houyu Chen | ✅ Yes |
| "H. Chen" | Houyu Chen | ✅ Yes |
| "Chen, H." | Houyu Chen | ✅ Yes |
| "HOUYU CHEN APT 5" | Houyu Chen | ✅ Yes (ignores address) |
| "Unknown Person" | None | ✅ Returns NONE |
| Handwriting "Chen" | Houyu Chen | ✅ Partial match |
| Stylized fonts | - | ✅ Much better than Tesseract |

## Environment Setup

### Required: Gemini API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Generative Language API
3. Create API key
4. Add to backend `.env`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

See: `docs/GEMINI_OCR_SETUP.md` for detailed instructions

## Fallback Strategy

If smart matching fails (API error, timeout, low confidence):

1. **Tesseract OCR** - Extract text locally
2. **Fuse.js Fuzzy Matching** - Match to contacts
3. **User Confirmation** - Always show confirmation modal

This ensures the feature ALWAYS works, even if:
- Gemini API is down
- Rate limit exceeded
- Network issues
- API key issues

## Testing

### Manual Testing Steps

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `/dashboard/scan`
4. Click "Start New Session"
5. Scan a mail item with various edge cases:
   - Last name first: "CHEN HOUYU"
   - Missing spaces: "HouYuChen"
   - Abbreviated: "H. Chen"
   - With address: "Chen Houyu, 123 Main St"
6. Verify:
   - ✅ Correct contact matched
   - ✅ Confidence percentage shown
   - ✅ Reason displayed in console
   - ✅ Fallback works if Gemini fails

### Console Logs to Check

```
🤖 Step 1: Trying smart AI matching with Gemini...
🤖 Calling Gemini with smart matching...
📄 Gemini Response: EXTRACTED: ... MATCHED: ... CONFIDENCE: ...
✅ Smart match result: { extracted: ..., matched: ..., confidence: ... }
✅ Match complete: confidence 95%
```

## Benefits Over Previous Approach

| Feature | Old (Tesseract + Fuse.js) | New (Smart Gemini) |
|---------|---------------------------|-------------------|
| Handle name order | ❌ No | ✅ Yes |
| Handle abbreviations | ❌ No | ✅ Yes |
| Handle stylized fonts | ❌ Poor | ✅ Excellent |
| Handle handwriting | ❌ No | ✅ Good |
| Context awareness | ❌ None | ✅ High |
| Reasoning | ❌ None | ✅ Explains matches |
| Speed (easy images) | ✅ Fast | ⚠️ Moderate |
| Privacy | ✅ Local | ⚠️ Cloud (secure) |
| Cost | ✅ Free | ✅ Free (within limits) |

## Future Enhancements

### Potential Improvements

1. **Caching:** Cache recent OCR results to reduce API calls
2. **Batch Processing:** Send multiple images in one request
3. **Learning:** Track which variations Gemini handles well
4. **User Feedback:** Let users report incorrect matches to improve prompts
5. **Multi-language:** Extend prompt to handle non-English names

### Optimization Ideas

1. **Compress images** before sending (reduce API payload)
2. **Pre-filter contacts** by building/floor to reduce list size
3. **Local Gemini:** Explore on-device Gemini Nano (future)

## Troubleshooting

### Common Issues

**Issue:** `GEMINI_API_KEY is not set`
- **Fix:** Add API key to backend `.env` file

**Issue:** `Google AI Studio not available in your region`
- **Fix:** Use Google Cloud Console instead of AI Studio

**Issue:** Rate limit exceeded (429 error)
- **Fix:** Fallback will handle this automatically
- **Long-term:** Implement caching or upgrade to paid tier

**Issue:** No match found for obvious name
- **Fix:** Check contact list is being sent correctly
- **Fix:** Check Gemini response parsing in console logs

**Issue:** Slow performance (>5 seconds)
- **Fix:** Network issue - check internet connection
- **Fix:** Image too large - implement compression

## Related Files

- **Frontend:**
  - `frontend/src/utils/smartMatch.ts` - Smart matching utility
  - `frontend/src/pages/ScanSession.tsx` - Main scan UI
  
- **Backend:**
  - `backend/src/controllers/scan.controller.js` - Smart match endpoint
  - `backend/src/routes/scan.routes.js` - Route definition

- **Documentation:**
  - `docs/GEMINI_OCR_SETUP.md` - API key setup
  - `docs/SCAN_FEATURE_GUIDE.md` - Overall feature guide

## Credits

- **Gemini 1.5 Flash** by Google DeepMind
- **Structured prompting** technique for reliable parsing
- **Fallback strategy** ensures robustness


