# ngrok Setup Guide

This guide explains how to expose your local development environment to the internet using ngrok for client demos or remote testing.

## Prerequisites

- ngrok installed (`brew install ngrok` on macOS or download from https://ngrok.com)
- Backend running on port 5000
- Frontend running on port 5173

## Quick Start

### 1. Start Your Development Servers

First, make sure both backend and frontend are running:

**Terminal 1 - Backend:**
```bash
cd /Users/butterchen/Desktop/mail-management-system/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd /Users/butterchen/Desktop/mail-management-system/frontend
npm run dev
```

### 2. Start ngrok Tunnels

You need TWO separate ngrok tunnels - one for frontend, one for backend.

**Terminal 3 - Frontend ngrok:**
```bash
cd /Users/butterchen/Desktop/mail-management-system
ngrok http 5173
```

**Terminal 4 - Backend ngrok:**
```bash
ngrok http 5000
```

### 3. Configure Environment Variables

After starting ngrok, you'll see URLs like:
- Frontend: `https://d69aaab49e59.ngrok-free.app`
- Backend: `https://04072ec657fe.ngrok-free.app`

**Update Backend CORS:**

Create or update `backend/.env.local`:
```env
FRONTEND_URL=https://YOUR-FRONTEND-NGROK-URL.ngrok-free.app
```

**Update Frontend API URL:**

Create or update `frontend/.env.local`:
```env
VITE_API_URL=https://YOUR-BACKEND-NGROK-URL.ngrok-free.app/api
```

### 4. Restart Servers

After updating environment variables:

- **Backend**: Stop (`Ctrl+C`) and restart `npm start`
- **Frontend**: Vite should auto-reload (if not, restart `npm run dev`)

### 5. Share the Link

Give the **frontend ngrok URL** to your client:
```
https://YOUR-FRONTEND-NGROK-URL.ngrok-free.app
```

## Important Notes

⚠️ **ngrok URLs change every time you restart** (on the free plan). You'll need to update `.env.local` files each time.

⚠️ **Don't commit `.env.local` files** - they're already in `.gitignore` and are only for temporary demo use.

⚠️ **Reset after demo** - Remove or reset `.env.local` files to use local URLs again:
- `backend/.env.local` should have `FRONTEND_URL=http://localhost:5173`
- `frontend/.env.local` should have `VITE_API_URL=http://localhost:5000/api`

## Configuration Details

### Frontend Configuration

The frontend is already configured to support ngrok in `vite.config.ts`:

```typescript
server: {
  host: true,
  port: 5173,
  allowedHosts: [
    '.ngrok-free.app',
    '.ngrok.io',
    '.ngrok.app',
    'localhost',
    '127.0.0.1'
  ]
}
```

### Backend Configuration

The backend CORS is configured in `src/server.js`:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### API Client Headers

The frontend API client automatically includes `ngrok-skip-browser-warning: true` header to bypass ngrok's warning page (see `frontend/src/lib/api-client.ts`).

## Troubleshooting

### Backend not connecting
- Check that `VITE_API_URL` in `frontend/.env.local` points to the backend ngrok URL with `/api` at the end
- Verify backend is running and accessible at the ngrok URL

### CORS errors
- Ensure `FRONTEND_URL` in `backend/.env.local` matches your frontend ngrok URL exactly
- Restart the backend after changing environment variables

### ngrok "host not allowed" error
- Frontend: Already fixed in `vite.config.ts`
- Backend: No special config needed

### Empty data / not loading
- Check browser console for API errors
- Verify ngrok tunnels are active in both terminal windows
- Ensure you're logged in (ngrok preserves authentication state)

## Multiple Sessions

If you need to run multiple ngrok sessions simultaneously, you can use ngrok's config file:

1. Create `ngrok.yml`:
```yaml
tunnels:
  frontend:
    proto: http
    addr: 5173
  backend:
    proto: http
    addr: 5000
```

2. Start both tunnels at once:
```bash
ngrok start --all
```

## Security Note

ngrok URLs are publicly accessible. Only use this for:
- Client demos
- Remote testing with trusted users
- Short-term sharing

Never share production credentials or sensitive data over ngrok tunnels.

