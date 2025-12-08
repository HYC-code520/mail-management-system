# Smart AI Matching - Testing Guide

## ✅ Quick Test Checklist

Use this checklist to verify the smart matching is working correctly.

### Prerequisites

- [ ] Backend is running (`cd backend && npm start`)
- [ ] Frontend is running (`cd frontend && npm run dev`)
- [ ] Gemini API key is set in `backend/.env`
- [ ] You have test contacts in the database

### Test Cases

#### Test 1: Normal Name Match ✅
**Input:** "Houyu Chen" (clear printed text)  
**Expected:** Match to "Houyu Chen" contact with 90%+ confidence  
**Steps:**
1. Go to `/dashboard/scan`
2. Click "Start New Session"
3. Scan/upload image with "Houyu Chen"
4. Verify:
   - ✅ Correct contact matched
   - ✅ High confidence (90%+)
   - ✅ Shows reason in console

#### Test 2: Reversed Name Order ✅
**Input:** "CHEN HOUYU" (last name first)  
**Expected:** Match to "Houyu Chen" contact with 85%+ confidence  
**Steps:**
1. Scan/upload image with "CHEN HOUYU"
2. Verify:
   - ✅ Still matches "Houyu Chen"
   - ✅ Good confidence (85%+)
   - ✅ Reason mentions "reversed order"

#### Test 3: Missing Spaces ✅
**Input:** "HouYuChen" or "Hou Yu Chen"  
**Expected:** Match to "Houyu Chen" contact with 80%+ confidence  
**Steps:**
1. Scan/upload image with spacing variations
2. Verify:
   - ✅ Still matches "Houyu Chen"
   - ✅ Decent confidence (80%+)
   - ✅ Handles spacing correctly

#### Test 4: Abbreviations ✅
**Input:** "H. Chen" or "H Chen"  
**Expected:** Match to "Houyu Chen" contact with 70%+ confidence  
**Steps:**
1. Scan/upload image with abbreviated name
2. Verify:
   - ✅ Matches "Houyu Chen"
   - ✅ Moderate confidence (70%+)
   - ✅ May show as "uncertain" (yellow badge)

#### Test 5: No Match ✅
**Input:** "Unknown Person XYZ"  
**Expected:** No match, confidence <50%  
**Steps:**
1. Scan/upload image with unknown name
2. Verify:
   - ✅ Shows "failed" status (red badge)
   - ✅ Low confidence
   - ✅ Allows manual selection

#### Test 6: With Address ✅
**Input:** "Houyu Chen\n123 Main St\nNew York, NY"  
**Expected:** Match to "Houyu Chen", ignore address  
**Steps:**
1. Scan/upload full mail label with address
2. Verify:
   - ✅ Extracts only recipient name
   - ✅ Ignores address lines
   - ✅ Matches correctly

#### Test 7: Stylized Fonts ✅
**Input:** Stylized/decorative text "𝓗𝓸𝓾𝔂𝓾 𝓒𝓱𝓮𝓷"  
**Expected:** Gemini handles better than Tesseract  
**Steps:**
1. Use an image with stylized fonts
2. Verify:
   - ✅ Gemini extracts text correctly
   - ✅ Matches to contact
   - ✅ Console shows "smart AI matching"

#### Test 8: Fallback to Tesseract ✅
**Scenario:** Gemini API fails or returns low confidence  
**Expected:** Automatically falls back to Tesseract + fuzzy match  
**Steps:**
1. Temporarily break Gemini (remove API key or disconnect internet)
2. Scan an image
3. Verify:
   - ✅ Console shows fallback attempt
   - ✅ Still attempts to match (may be less accurate)
   - ✅ User can still confirm/edit

## Console Log Examples

### Successful Smart Match

```
🤖 Step 1: Trying smart AI matching with Gemini...
🤖 Calling smart match with 25 contacts...
🤖 Calling Gemini with smart matching...
📄 Gemini Response: EXTRACTED: CHEN HOUYU
MATCHED: 5
CONFIDENCE: 95
REASON: Name matches customer #5 "Houyu Chen", just reversed order (last name first)
✅ Smart match result: {
  extracted: 'CHEN HOUYU',
  matched: 'Houyu Chen',
  confidence: '95%',
  reason: 'Name matches customer #5 "Houyu Chen", just reversed order (last name first)'
}
✅ Match complete: confidence 95% Name matches customer #5 "Houyu Chen", just reversed order (last name first)
```

### Fallback to Tesseract

```
🤖 Step 1: Trying smart AI matching with Gemini...
⚠️ Gemini confidence low or no match (45%), trying fallback...
📸 Fallback: Trying Tesseract OCR...
📄 OCR Raw Text: HOUYU CHEN
123 MAIN ST
NEW YORK NY
✅ Fallback found better match!
✅ Match complete: confidence 75% Fallback fuzzy match on contact_person
```

## Troubleshooting

### Issue: "GEMINI_API_KEY is not set"

**Cause:** Missing API key in backend `.env`  
**Fix:**
1. Open `backend/.env`
2. Add: `GEMINI_API_KEY=your_actual_api_key_here`
3. Restart backend server

### Issue: All matches show low confidence (<50%)

**Cause:** Contact list not being sent to Gemini  
**Fix:**
1. Check console logs - should show "Calling smart match with X contacts"
2. Verify `contacts` array is populated
3. Check network tab - `/api/scan/smart-match` should include contacts in payload

### Issue: 429 Rate Limit Exceeded

**Cause:** Too many requests to Gemini API (>15/min or >1500/day)  
**Fix:**
- Wait 1 minute and try again
- Fallback should handle automatically
- Consider implementing request caching

### Issue: Slow performance (>5 seconds per scan)

**Cause:** Large image size or slow network  
**Fix:**
- Images are being sent to Gemini API (requires internet)
- Check internet connection
- Consider implementing image compression

### Issue: Wrong matches

**Cause:** Similar names in contact list  
**Fix:**
- Check Gemini's reason in console
- Improve contact list (add mailbox numbers to prompt)
- User can manually correct in confirmation modal

## API Key Setup

If you don't have a Gemini API key yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable "Generative Language API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the key
6. Add to `backend/.env`:
   ```
   GEMINI_API_KEY=AIza...your_key_here
   ```
7. Restart backend server

See `docs/GEMINI_OCR_SETUP.md` for detailed instructions.

## Success Criteria

After testing, you should see:

✅ **High accuracy** for normal names (90%+)  
✅ **Good accuracy** for edge cases (70-80%+)  
✅ **Fallback works** when Gemini fails  
✅ **Fast performance** (<3 seconds per scan)  
✅ **User confirmation** for all matches  
✅ **Console logs** show reasoning

## Performance Benchmarks

| Scenario | Expected Time | Expected Confidence |
|----------|--------------|---------------------|
| Clear printed name | 1-2 seconds | 90-95% |
| Reversed name order | 1-2 seconds | 85-90% |
| Abbreviations | 1-2 seconds | 70-80% |
| Stylized fonts | 2-3 seconds | 80-90% |
| Handwriting | 2-3 seconds | 60-80% |
| Fallback to Tesseract | 3-4 seconds | 50-70% |

## Next Steps After Testing

Once all tests pass:

1. ✅ Commit changes
2. ✅ Update user documentation
3. ✅ Train staff on new feature
4. ✅ Monitor API usage (stay within free tier)
5. ✅ Gather user feedback
6. ✅ Iterate on prompt if needed

## Demo Day Tips

For a successful demo:

1. **Pre-load contacts** - Have 5-10 test contacts ready
2. **Prepare test images** - Print labels with various edge cases
3. **Show console logs** - Demonstrate the AI reasoning
4. **Show fallback** - Disconnect internet briefly to show robustness
5. **Emphasize speed** - 2-3 seconds per scan vs. 30 seconds manual logging
6. **Emphasize accuracy** - Handles edge cases humans might miss
7. **Show bulk submit** - Scan 5 items, submit all at once

**Key talking points:**
- 🤖 "AI-powered with Google Gemini"
- ⚡ "10x faster than manual logging"
- 🎯 "Handles tricky cases like reversed names"
- 🔒 "Secure with fallback options"
- 💰 "Free tier covers typical usage"

