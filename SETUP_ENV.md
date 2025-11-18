# 🚀 Quick Setup Guide - Get Your Website Running!

## Problem: "Supabase URL and Key required" Error

You're seeing this error because the app needs database credentials. Here are your options:

---

## ✅ Option 1: View Design System (No Setup Needed!)

**The design system page works without authentication!**

Just visit: **http://localhost:3000/design-system**

You'll see all the UI components, colors, buttons, forms, etc.

---

## 🔧 Option 2: Set Up Environment Variables (5 minutes)

To use the full app (sign in, dashboard, etc.), you need to create a `.env.local` file.

### Step 1: Create the file

In your terminal:

```bash
cd /Users/butterchen/Desktop/pursuithackathon

# Create .env.local file
touch .env.local
```

### Step 2: Add these contents

Open `.env.local` in your code editor and paste:

```env
# Temporary mock values for development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 3: Restart your dev server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Try accessing pages

- **Design System:** http://localhost:3000/design-system ✅
- **Home:** http://localhost:3000
- **Sign In:** http://localhost:3000/signin (will still error without database)

---

## 🗄️ Option 3: Set Up Local Supabase (Full Setup - 10 minutes)

For full functionality including authentication:

### Step 1: Install Docker Desktop

Download from: https://www.docker.com/products/docker-desktop

### Step 2: Start Local Supabase

```bash
cd /Users/butterchen/Desktop/pursuithackathon

# Start local Supabase (first time takes a few minutes)
npx supabase start
```

This will output something like:

```
API URL: http://localhost:54321
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

### Step 3: Create .env.local with REAL values

```bash
# Copy the values from the output above
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

### Step 4: Run the schema

```bash
# Apply the database schema
npx supabase db reset
```

### Step 5: Restart dev server

```bash
npm run dev
```

### Step 6: Create a test account

Visit: http://localhost:3000/signin

Click "Sign Up" and create an account:
- Email: `test@example.com`
- Password: `password123` (at least 6 characters)

---

## 🎯 Quick Test - What Works Right Now

### ✅ Works Without Setup:
- Design System page: **/design-system** 
- Home page: **/** (will show Supabase error in console, but page loads)

### ⚠️ Needs Setup:
- Sign In/Sign Up
- Dashboard
- Account page
- Any authenticated features

---

## 💡 Recommended Path for Frontend Development

**For now, to see your design system:**

1. Just visit **http://localhost:3000/design-system**
2. Ignore the Supabase error in the browser console
3. The page will still render and show all components

**When you need authentication:**

1. Follow Option 2 above (mock .env.local)
2. Or ask your backend teammate to set up Supabase

---

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### Port 3000 already in use
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
# Or use a different port
PORT=3001 npm run dev
```

### Changes not showing up
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 📞 Need Help?

Ask your backend teammate to:
1. Set up Supabase (cloud or local)
2. Share the environment variables with you
3. Run the schema migration

Or just use **/design-system** page for now! 🎨

