# Mail Management System

Internal CRM and mail tracking system for managing customer contacts, mail items, and outreach communications.

## 🎯 Overview

This application helps manage:
- **Customer Contacts** - Track customer information, service tiers, and contact preferences
- **Mail Items** - Log packages, letters, and certified mail with real-time status tracking
- **Outreach Messages** - Record all customer communications and follow-ups
- **Templates** - Manage reusable message templates
- **Dashboard Analytics** - View real-time statistics and pending actions

## 🚀 Features

- ✅ Customer contact management with search and filtering
- ✅ Mail item tracking (packages, letters, certified mail)
- ✅ Status tracking (Received → Notified → Picked Up)
- ✅ Outreach message logging with templates
- ✅ Real-time dashboard with statistics
- ✅ Secure authentication with Supabase
- ✅ Modern, responsive UI with Tailwind CSS and Radix UI
- 🔄 Bilingual support (Coming soon)
- 🔄 Email/SMS integration (Coming soon)

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide React icons
- **State Management**: React Context API
- **Date Handling**: date-fns

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth

### Database & Auth
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with JWT tokens
- **Storage**: Supabase Storage (if needed)

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/HYC-code520/mail-management-system.git
   cd mail-management-system
   ```

2. **Set up Supabase**
   
   Create a new project at [supabase.com](https://supabase.com), then:
   
   - Go to Settings → API
   - Copy your Project URL and anon key
   - Go to SQL Editor and run the schema from `supabase/migrations/20230530034630_init.sql`
   - Optionally, seed sample data using scripts in the `scripts/` folder

3. **Configure Backend**
   
   ```bash
   cd backend
   npm install
   ```
   
   Create `.env` in the backend folder:
   ```env
   PORT=5000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Configure Frontend**
   
   ```bash
   cd ../frontend
   npm install
   ```
   
   Create `.env` in the frontend folder:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:5000
   ```

5. **Start the Development Servers**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on http://localhost:5000
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on http://localhost:5173

6. **Open your browser**
   
   Navigate to [http://localhost:5173](http://localhost:5173)

## 📚 Documentation

**📖 [Complete Documentation Index](./docs/README.md)** - Full documentation catalog

### Quick Links:

**Getting Started:**
- **[Setup Guide](./docs/SETUP_ENV.md)** - Environment setup and configuration
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

**Testing & Quality:**
- **[Automated Testing Guide](./docs/AUTOMATED_TESTING_GUIDE.md)** - Complete testing workflow
- **[Testing Details](./docs/TESTING_COMPLETE.md)** - What's being tested
- **[CI/CD Pipeline](./docs/CI_CD_SETUP_COMPLETE.md)** - GitHub Actions and automation

**Development:**
- **[Design System](./docs/DESIGN_SYSTEM_GUIDE.md)** - UI components and styling
- **[Icon Guide](./docs/ICON_GUIDE.md)** - Icon usage guidelines
- **[Branch Protection](./docs/BRANCH_PROTECTION_GUIDE.md)** - Git workflow and PR process

**Project Info:**
- **[Progress Summary](./docs/PROGRESS_SUMMARY.md)** - Current project status
- **[Frontend Architecture](./docs/FRONTEND_BUILD_SUMMARY.md)** - Frontend details

## 🗄️ Database Schema

Main tables:
- `contacts` - Customer information and contact details
- `mail_items` - Package/mail tracking with status history
- `outreach_messages` - Communication history linked to contacts
- `message_templates` - Pre-built message templates for quick communication

See `supabase/migrations/20230530034630_init.sql` for complete schema.

## 🚢 Deployment

### Backend Deployment

**Option 1: Railway / Render / Fly.io**
1. Push your code to GitHub
2. Connect your repository
3. Set environment variables
4. Deploy!

**Option 2: VPS (DigitalOcean, AWS, etc.)**
```bash
npm run build
npm start
```

### Frontend Deployment

**Vercel (Recommended)**
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Add environment variables
5. Deploy!

**Netlify**
Similar process with `dist` as the publish directory.

### Environment Variables for Production

**Backend:**
```
PORT=5000
SUPABASE_URL=your-production-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend:**
```
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=your-backend-api-url
```

## 🧪 Development

### Available Scripts

**Backend:**
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
```

**Frontend:**
```bash
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure

```
mail-management-system/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth, error handling
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Supabase service
│   │   └── server.js         # Express app entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Auth, etc.)
│   │   ├── lib/             # Utilities and API client
│   │   ├── pages/           # Page components
│   │   └── types/           # TypeScript type definitions
│   └── package.json
├── docs/                    # Documentation
├── scripts/                 # Database scripts
└── supabase/               # Supabase configuration
```

## 📖 Usage

### Basic Workflow

1. **Sign In** - Authenticate with Supabase credentials
2. **Dashboard** - View overview of mail items, contacts, and statistics
3. **Add Contact** - Create customer profile with contact details
4. **Log Mail Item** - Record new package/letter for a contact
5. **Send Message** - Use templates to notify customer via outreach
6. **Track Status** - Update status when customer picks up mail
7. **View Intake** - See incoming mail requiring action

### Authentication

- Uses Supabase Authentication
- JWT tokens are automatically managed
- Protected routes redirect to sign-in if not authenticated

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ Supabase Row Level Security (RLS) policies
- ✅ Server-side authentication checks via middleware
- ✅ JWT token validation
- ✅ .gitignore configured for .env files
- 🔄 Input validation (coming soon)
- 🔄 Rate limiting (coming soon)

## 🆘 Troubleshooting

### Frontend won't start
- Ensure all dependencies are installed: `npm install`
- Check that `.env` file exists with correct `VITE_*` variables
- Clear Vite cache: `rm -rf node_modules/.vite`

### Backend connection issues
- Verify backend is running on http://localhost:5000
- Check `VITE_API_URL` in frontend `.env`
- Ensure Supabase credentials are correct

### "Supabase URL required" Error
- Make sure `.env` exists in the frontend folder
- Variables must start with `VITE_` prefix for Vite
- Restart dev server after changing env variables

### Database Connection Issues
- Verify Supabase project is active
- Check API keys are correct in backend `.env`
- Ensure database schema is applied

### Authentication Issues
- Check that JWT tokens are being passed correctly
- Verify Supabase auth settings
- Clear browser localStorage and try signing in again

For more help, see [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## 🤝 Contributing

This is an internal project. For questions or suggestions, contact the development team.

## 📄 License

Copyright © 2024-2025. All rights reserved.

This software is proprietary and confidential.

---

**Built with ❤️ for efficient mail management**
