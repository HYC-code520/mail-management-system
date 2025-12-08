# 📱 Mobile Testing Setup - Quick Guide

## Your Network Details

- **Your Computer's IP**: `163.182.130.218`
- **Frontend URL**: `http://163.182.130.218:5173`
- **Backend URL**: `http://163.182.130.218:5000`

---

## ⚙️ Setup Steps

### Step 1: Restart Frontend with Network Access

**In Terminal 1 (frontend):**

1. Press `Ctrl+C` to stop the current server
2. Run:
   ```bash
   npm run dev -- --host
   ```

You should see output like:
```
➜  Local:   http://localhost:5173/
➜  Network: http://163.182.130.218:5173/
```

### Step 2: Verify Backend is Running

**Backend should already be running in Terminal 2.** I've updated the CORS to allow local network IPs, so it should auto-reload.

If not, restart it:
```bash
# In Terminal 2 (backend):
npm run dev
```

### Step 3: Test on Your Phone

1. **Make sure your phone is on the SAME WiFi** as your computer
2. **Open browser on phone** (Safari or Chrome)
3. **Navigate to**:
   ```
   http://163.182.130.218:5173
   ```
4. **Log in** with your credentials
5. **Go to**: Click "📱 Scan" in the navigation
   - Or navigate directly to: `http://163.182.130.218:5173/dashboard/scan`

---

## 🧪 Testing the Scan Feature

### 1. Start Session
- Tap "Start New Session"
- Wait 2-3 seconds (OCR worker initializes)

### 2. Scan First Item
- Tap "Scan Next Item"
- Camera opens
- Take photo of mail (name clearly visible)
- Wait 1-2 seconds for OCR
- Verify matched customer is correct
- Select Letter or Package
- Tap "Confirm"
- Phone should vibrate!

### 3. Scan More Items
- Repeat for 2-3 more items
- Try scanning multiple items for the SAME customer

### 4. Review & Submit
- Tap "End Session"
- Check grouped items by customer
- Tap "Submit All & Send Notifications"
- 🎉 **CONFETTI!**

---

## ⚠️ Important: Database Migration

Before testing, make sure you've applied the database migration!

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Open: `supabase/migrations/20250206000000_add_scan_templates.sql`
3. Copy and paste into SQL Editor
4. Run the query

This creates the 3 email templates the scan feature needs.

---

## 🐛 Troubleshooting

### "Can't reach the site"
- ✅ Check both phone and computer are on same WiFi
- ✅ Check IP address is correct (run `ifconfig | grep "inet "` again)
- ✅ Check frontend is running with `--host` flag
- ✅ Try disabling computer firewall temporarily

### "Camera doesn't open"
- ✅ Check browser permissions (Settings → Safari/Chrome → Camera)
- ✅ Try Chrome instead of Safari (or vice versa)
- ✅ Some browsers need HTTPS (use ngrok if this happens)

### "CORS Error"
- ✅ Backend has been updated to allow local IPs
- ✅ Check backend terminal for CORS logs
- ✅ Restart backend if needed

### "OCR doesn't work"
- ✅ First load needs internet to download OCR model
- ✅ Check browser console for errors
- ✅ Wait 5-10 seconds on first photo

### "No matches found"
- ✅ OCR extracted wrong text
- ✅ Manually select customer from dropdown
- ✅ Try retaking photo with better lighting

---

## 📊 What to Check After Testing

1. **Dashboard → Mail Log**
   - New entries should appear
   - Status: "Notified"
   - Check received_date

2. **Email Inbox**
   - Customer should receive ONE grouped email
   - Check "You have X letters and Y packages"

3. **Database (optional)**
   ```sql
   SELECT * FROM mail_items 
   WHERE scan_method = 'mobile_scan_session'
   ORDER BY created_at DESC;
   ```

---

## 💡 Quick Test (5 minutes)

1. ✅ Start session on phone
2. ✅ Scan 3 items (2 for same customer, 1 for different)
3. ✅ End session and review grouping
4. ✅ Submit and see confetti
5. ✅ Check email was sent
6. ✅ Check mail log has entries

---

## 🎉 Success Checklist

- [ ] Frontend accessible on phone at `http://163.182.130.218:5173`
- [ ] Can log in on phone
- [ ] Camera opens when clicking "Scan Next Item"
- [ ] OCR extracts names (may take 1-3 seconds)
- [ ] Can confirm scanned items
- [ ] Review screen groups items correctly
- [ ] Submit creates mail items
- [ ] Email notification sent
- [ ] Confetti shows on success

---

**Ready to test!** Just restart your frontend with `--host` and open the URL on your phone! 📱✨


