# 🔐 OAuth2 Gmail Setup Guide

## Complete Implementation Guide for OAuth2 Gmail Authentication

**✅ OAuth2 is now fully implemented!** This guide will walk you through setting up Google OAuth2 for secure Gmail sending without App Passwords.

---

## 📋 What's Different with OAuth2?

| Feature | App Password (Old) | OAuth2 (New) |
|---------|-------------------|--------------|
| **2FA Required** | Yes, permanently | No |
| **Password Storage** | Store in `.env` | No password needed |
| **Setup** | 5 minutes | 15 minutes (one-time) |
| **Security** | Good 🔒 | Better 🔐 |
| **User Experience** | N/A | "Connect Gmail" button |
| **Per-User Sending** | No (shared account) | Yes (each user's Gmail) |

---

## 🚀 Setup Steps

### Step 1: Create Google Cloud Project (5 minutes)

1. **Go to Google Cloud Console:**  
   https://console.cloud.google.com/

2. **Create a new project:**
   - Click "Select a project" → "New Project"
   - Project name: `MeiWay Mail System`
   - Click "Create"

3. **Enable Gmail API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Create OAuth2 Credentials (5 minutes)

1. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (or "Internal" if you have Google Workspace)
   - Click "Create"
   
   **Fill in:**
   - App name: `MeiWay Mail System`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   
   **Scopes:**
   - Click "Add or Remove Scopes"
   - Add:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click "Save and Continue"
   
   **Test users:** (For External apps in development)
   - Add email addresses of users who will test (e.g., MeiWay staff emails)
   - Click "Save and Continue"

2. **Create OAuth Client ID:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `MeiWay Mail OAuth`
   
   **Authorized redirect URIs:**
   ```
   http://localhost:5000/api/oauth/gmail/callback
   http://localhost:3000/settings
   ```
   
   (Add production URLs later when deployed)
   
   - Click "Create"
   
3. **Copy Credentials:**
   - You'll see a popup with:
     - **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-xxxxx`)
   - **Copy both** - you'll need them next!

### Step 3: Update Backend `.env` File

Add these lines to `/backend/.env`:

```env
# OAuth2 Configuration (Gmail)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/gmail/callback
FRONTEND_URL=http://localhost:3000

# Keep existing SMTP config as fallback (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=meiway@gmail.com
SMTP_PASS=app-password-here
SMTP_FROM_NAME=MeiWay Mail Service
```

**Important:**
- Replace `your-client-id-here` with your actual Client ID
- Replace `your-client-secret-here` with your actual Client Secret
- For production, update URLs to your actual domain

### Step 4: Run Database Migration

```bash
cd /Users/butterchen/Desktop/mail-management-system
npx supabase migration up --local
```

This creates the `oauth_tokens` table.

### Step 5: Restart Backend

```bash
cd backend
npm run dev
```

Should see: `✅ Email service ready`

---

## 🎨 How Users Connect Gmail

### Backend Flow (Already Implemented)

**Endpoints available:**
- `GET /api/oauth/gmail/auth-url` - Get authorization URL
- `GET /api/oauth/gmail/callback` - Handle OAuth callback
- `GET /api/oauth/gmail/status` - Check connection status
- `POST /api/oauth/gmail/disconnect` - Disconnect Gmail

### Frontend Implementation (To Build)

Here's what you need to add to the frontend:

#### 1. Create Settings Page Component

```typescript
// frontend/src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

export default function Settings() {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAddress, setGmailAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkGmailStatus();
  }, []);

  async function checkGmailStatus() {
    try {
      const { connected, gmailAddress: email } = await api.oauth.getGmailStatus();
      setGmailConnected(connected);
      setGmail Address(email || '');
    } catch (error) {
      console.error('Error checking Gmail status:', error);
    }
  }

  async function connectGmail() {
    setLoading(true);
    try {
      const { authUrl } = await api.oauth.getGmailAuthUrl();
      window.location.href = authUrl; // Redirect to Google
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setLoading(false);
    }
  }

  async function disconnectGmail() {
    setLoading(true);
    try {
      await api.oauth.disconnectGmail();
      setGmailConnected(false);
      setGmailAddress('');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
      
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Gmail Integration</h2>
        
        {gmailConnected ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-500">✓</span>
              <span className="text-zinc-300">Connected: {gmailAddress}</span>
            </div>
            <button
              onClick={disconnectGmail}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              {loading ? 'Disconnecting...' : 'Disconnect Gmail'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-zinc-400 mb-4">
              Connect your Gmail account to send emails directly from the system.
            </p>
            <button
              onClick={connectGmail}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              {loading ? 'Connecting...' : '🔗 Connect Gmail'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 2. Update API Client

Add to `/frontend/src/lib/api-client.ts`:

```typescript
oauth: {
  getGmailAuthUrl: () => apiClient.get('/oauth/gmail/auth-url'),
  getGmailStatus: () => apiClient.get('/oauth/gmail/status'),
  disconnectGmail: () => apiClient.post('/oauth/gmail/disconnect', {}),
},
```

#### 3. Add Route

In `App.tsx`:

```typescript
import Settings from './pages/Settings';

// In your routes:
<Route path="/settings" element={
  <ProtectedRoute>
    <DashboardLayout>
      <Settings />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

---

## 🔄 How It Works

### User Flow:

1. **User clicks "Connect Gmail"**  
   → Frontend calls `/api/oauth/gmail/auth-url`

2. **Redirected to Google**  
   → User logs into their Gmail  
   → Google asks: "Allow MeiWay to send emails?"

3. **User clicks "Allow"**  
   → Google redirects back to `/api/oauth/gmail/callback?code=xxx`

4. **Backend exchanges code for tokens**  
   → Saves tokens to database  
   → Redirects user back to frontend

5. **Done!** ✅  
   → User's Gmail is now connected  
   → Emails will be sent from their account

### Sending Emails:

```javascript
// The system automatically uses OAuth2 if user has connected Gmail
await api.emails.sendWithTemplate({
  contact_id: 'uuid',
  template_id: 'uuid',
  // userId is automatically included from auth token
});
```

**Fallback:** If OAuth2 isn't configured, system falls back to SMTP (App Password method).

---

## 🔒 Security Benefits

✅ **No password storage** - Only OAuth tokens  
✅ **User-revocable** - Users can disconnect anytime  
✅ **Granular permissions** - Only "send email" permission  
✅ **Per-user sending** - Each staff member uses their own Gmail  
✅ **Token refresh** - Automatic token renewal  
✅ **Audit trail** - All emails logged with sender  

---

## 📊 Database Schema

The migration creates this table:

```sql
oauth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,           -- Links to auth.users
  gmail_address TEXT,            -- User's Gmail address
  access_token TEXT,             -- Short-lived token
  refresh_token TEXT,            -- Long-lived token
  token_expiry TIMESTAMPTZ,      -- When access_token expires
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 🐛 Troubleshooting

### "redirect_uri_mismatch" error
**Fix:** Add the exact redirect URI to Google Cloud Console:
- `http://localhost:5000/api/oauth/gmail/callback`

### "Access blocked: This app's request is invalid"
**Fix:** Make sure you added the Gmail API scope in OAuth consent screen.

### "This app isn't verified"
**Normal for development.** Click "Advanced" → "Go to MeiWay Mail System (unsafe)" to proceed.
For production, submit for Google verification (optional).

### Tokens not being saved
**Check:** Run the migration: `npx supabase migration up --local`

---

##  Comparison Summary

### Choose **SMTP (App Password)** if:
✅ Single shared business Gmail  
✅ Want simplest setup (5 min)  
✅ Small team using same sending address  
✅ Don't mind keeping 2FA on  

### Choose **OAuth2** if:
✅ Each staff member sends from their own Gmail  
✅ Want most secure option  
✅ Don't want any password storage  
✅ Need per-user email sending  
✅ Professional user experience  

---

## ✨ What's Implemented

✅ OAuth2 service with token management  
✅ OAuth2 endpoints (auth, callback, status, disconnect)  
✅ Email service with OAuth2 support  
✅ Automatic fallback to SMTP if OAuth2 not configured  
✅ Database migration for oauth_tokens table  
✅ Automatic token refresh  
✅ Per-user Gmail sending  

---

## 📝 Production Checklist

Before deploying to production:

- [ ] Update redirect URIs in Google Cloud Console with production URLs
- [ ] Update `.env` with production URLs
- [ ] (Optional) Submit OAuth consent screen for verification
- [ ] Test OAuth flow end-to-end
- [ ] Document for staff how to connect Gmail

---

## 🎉 Ready to Use!

OAuth2 is fully implemented on the backend. Just:
1. Set up Google Cloud Project (Steps 1-2)
2. Add credentials to `.env`
3. Run migration
4. Build frontend UI (Step 5)
5. Test!

**Need help?** Refer to this guide or check `/backend/README.md` for API documentation.

