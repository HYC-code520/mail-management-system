# Backend Connection Troubleshooting Guide

## Issue: Customer table not showing data / Backend not connected

### Step 1: Verify Backend is Running ✅

The backend should be running on **port 5000**. Check by visiting:
- Health check: `http://localhost:5000/health`
- Should return: `{"status":"ok","timestamp":"...","environment":"development"}`

### Step 2: Check Environment Variables

#### Backend `.env` file (`/backend/.env`):
```bash
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### Frontend `.env` file (`/frontend/.env`):
```bash
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd /Users/butterchen/Desktop/mail-management-system/backend
npm run dev
```
Should show:
```
🚀 Backend server running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
```

**Terminal 2 - Frontend:**
```bash
cd /Users/butterchen/Desktop/mail-management-system/frontend
npm run dev
```
Should show:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 4: Check Browser Console

Open browser DevTools (F12) → Console tab. Look for errors:

**Common Issues:**

1. **CORS Error:**
   ```
   Access to fetch at 'http://localhost:5000/api/contacts' from origin 'http://localhost:5173' has been blocked by CORS
   ```
   **Fix:** Backend CORS is already configured for localhost:5173

2. **401 Unauthorized:**
   ```
   Error: Unauthorized - No token provided
   ```
   **Fix:** Make sure you're signed in. The auth token is required.

3. **Network Error:**
   ```
   Failed to fetch
   ```
   **Fix:** Backend is not running. Start it with `npm run dev`

4. **Wrong API URL:**
   ```
   GET http://localhost:3000/api/contacts 404
   ```
   **Fix:** Check `VITE_API_URL` in frontend `.env` is set to `http://localhost:5000/api`

### Step 5: Test API Manually

After signing in, open DevTools → Network tab → Find any API request → Copy the Authorization header.

Then test manually:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:5000/api/contacts
```

Should return JSON array of contacts.

### Step 6: Check Database

Make sure you've:
1. Run the database schema in Supabase SQL Editor
2. Added mock data using `scripts/mock_data.sql`
3. Created a user account (sign up)
4. The contacts belong to your user_id

Query to check:
```sql
-- Get your user ID
SELECT id, email FROM auth.users;

-- Check contacts for your user
SELECT * FROM contacts WHERE user_id = 'your-user-id';

-- Check mail items
SELECT * FROM mail_items;
```

### Step 7: Quick Reset

If nothing works, try this complete restart:

```bash
# 1. Kill all processes
pkill -f "node"
pkill -f "vite"

# 2. Restart backend
cd /Users/butterchen/Desktop/mail-management-system/backend
npm run dev

# 3. Restart frontend (in new terminal)
cd /Users/butterchen/Desktop/mail-management-system/frontend
npm run dev

# 4. Clear browser cache and reload
# Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Common Solutions:

✅ **Backend not started** → Run `npm run dev` in backend folder
✅ **Wrong port** → Backend should be 5000, frontend should be 5173
✅ **Missing .env** → Create `.env` files in both frontend and backend
✅ **Not signed in** → Go to /signin and create an account
✅ **Empty database** → Run the mock_data.sql script
✅ **Wrong user_id** → Make sure mock data uses YOUR user_id

---

## Current Status Check:

Run these commands to verify everything:

```bash
# Check if backend is running
curl http://localhost:5000/health

# Check if frontend is running
curl http://localhost:5173

# Check both processes
lsof -ti:5000  # Should return a process ID
lsof -ti:5173  # Should return a process ID
```

If you see data in Supabase but not in the app, the issue is likely:
1. Not signed in (no auth token)
2. Backend not running
3. Wrong API URL in frontend .env


