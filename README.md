# Mail Management System

Internal CRM and mail tracking system for managing customer contacts, mail items, and outreach communications.

## 🎯 Overview

This application helps manage:
- **Customer Contacts** - Track customer information, service tiers, and contact preferences
- **Mail Items** - Log packages, letters, and certified mail with real-time status tracking
- **Outreach Messages** - Record all customer communications and follow-ups
- **Dashboard Analytics** - View real-time statistics and pending actions

## 🚀 Features

- ✅ Customer contact management with search and filtering
- ✅ Mail item tracking (packages, letters, certified mail)
- ✅ Status tracking (Received → Notified → Picked Up)
- ✅ Outreach message logging
- ✅ Real-time dashboard with statistics
- ✅ Secure authentication with Supabase
- ✅ Responsive UI with Tailwind CSS
- 🔄 Bilingual support (Coming soon)
- 🔄 Email/SMS integration (Coming soon)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (recommended)

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (free tier works)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/HYC-code520/mail-management-system.git
   cd mail-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up Supabase**
   
   Create a new project at [supabase.com](https://supabase.com), then:
   
   - Go to Settings → API
   - Copy your Project URL and anon key
   - Run the SQL schema: Copy contents of `simple_reset_rebuild.sql` into SQL Editor

4. **Configure environment variables**
   
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[Setup Guide](./SETUP_ENV.md)** - Detailed environment setup
- **[Architecture](./ARCHITECTURE.md)** - System architecture and data flow
- **[Implementation Plan](./IMPLEMENTATION_PLAN.md)** - Development roadmap
- **[Design System](./DESIGN_SYSTEM.md)** - UI components and styling guide

## 🗄️ Database Schema

Main tables:
- `contacts` - Customer information
- `mail_items` - Package/mail tracking
- `outreach_messages` - Communication history
- `message_templates` - Pre-built message templates

See `simple_reset_rebuild.sql` for complete schema.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub ✅ (Already done!)
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Set these in your hosting platform:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
```

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Supabase Commands

```bash
npm run supabase:start    # Start local Supabase
npm run supabase:stop     # Stop local Supabase
npm run supabase:reset    # Reset database
npm run supabase:types    # Generate TypeScript types
```

## 📖 Usage

### Basic Workflow

1. **Add Contact** - Create customer profile with contact details
2. **Log Mail Item** - Record new package/letter for a contact
3. **Send Notification** - Use templates to notify customer
4. **Track Status** - Update status when customer picks up mail
5. **View Dashboard** - Monitor pending items and follow-ups

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ Supabase Row Level Security (RLS) policies
- ✅ Server-side authentication checks
- ✅ .gitignore configured for .env files
- 🔄 Input validation (coming soon)
- 🔄 Rate limiting (coming soon)

## 🤝 Contributing

This is an internal project. For questions or suggestions, contact the development team.

## 📄 License

Copyright © 2024. All rights reserved.

This software is proprietary and confidential.

## 🆘 Troubleshooting

### "Supabase URL required" Error
- Make sure `.env.local` exists with correct values
- Restart dev server after changing env variables

### Database Connection Issues
- Verify Supabase project is active
- Check API keys are correct
- Ensure database schema is applied

### Build Errors
- Clear cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

For more help, see [SETUP_ENV.md](./SETUP_ENV.md)

---

**Built with ❤️ for efficient mail management**
