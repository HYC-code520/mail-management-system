# Project Plan: Mei Way Mail Plus - Internal Mail Management Tool

## 1. Project Overview

* **Application Type:** Desktop-First Web Application (Internal Operations Tool)
* **Target Platform:** Modern browsers (Chrome, Firefox, Safari, Edge) on desktop/laptop computers (1366px+ width)
* **Motivation:** Centralize scattered mail operations (spreadsheets, emails, handwritten notes) into one bilingual system to track incoming mail, notify customers (EN/中文), and reduce manual work for a 2-person team managing a growing mail volume from a building-wide contract.
* **Target Audience:** 
  * Primary: Merlin (Staff) - Daily operator handling mail intake, notifications, and logging
  * Secondary: Madison Rosa (Owner) - Oversees customer management, contracts, and business operations
  * Technical Comfort Level: Basic computer users comfortable with Gmail and spreadsheets; no technical expertise required
* **User Journey Map (Primary Goal - Daily Mail Processing):**
  1. Staff opens mail management system and logs in
  2. New mail arrives → Staff clicks "Add Mail Item"
  3. System shows intake form (auto-filled date, type dropdown, note field)
  4. Staff searches for customer by name/company/box number → Links mail to customer profile
  5. Staff clicks "Notify Customer" → System displays bilingual template with pre-filled customer details
  6. Staff copies template and pastes into Gmail → Sends notification manually
  7. Staff returns to system and marks mail status as "Notified"
  8. Customer picks up mail → Staff updates status to "Picked Up"
  9. End of day: Staff reviews dashboard showing pending/overdue mail items

## 2. Technical Architecture & Design

### **Technology Stack:**

* **Frontend:** 
  * Framework: React 18 + TypeScript
  * State Management: React Context API + React Query (server state caching)
  * Key Libraries: React Router v6, Axios, date-fns, React Hot Toast (notifications)
  * UI Framework: Tailwind CSS + Shadcn UI components
* **Backend:** 
  * Runtime/Framework: Node.js 20 LTS + Express.js + TypeScript
  * Authentication: Supabase Auth (JWT-based with httpOnly cookies)
  * ORM: Prisma (type-safe database client)
  * Validation: Zod (schema validation)
  * Security: Helmet.js, express-rate-limit, CORS configuration
* **Database:** 
  * Type: Relational SQL
  * Specific Technology: PostgreSQL 15 (hosted on Supabase)
  * Future Storage: Supabase Storage for package photos and signature images (URLs stored in PostgreSQL)
* **Testing:**
  * Unit Testing: Jest + ts-jest
  * Integration Testing: Supertest (API endpoints) + React Testing Library (components)
  * E2E Testing: Playwright (critical user flows)
  * Code Coverage Target: ≥80% for business logic
* **Deployment:**
  * Platform: 
    * Frontend: Vercel (free tier, automatic HTTPS, global CDN)
    * Backend: Render.com (free tier) or Railway.app (free tier with $5 monthly credit)
    * Database: Supabase (free tier: 500MB storage, 50K monthly active users)
  * CI/CD Pipeline: GitHub Actions for automated testing + deployment on push to `main`
  * Environment Strategy: `.env.development`, `.env.production` with separate Supabase projects

### **UI/UX Design System:**

* **Component Library:** Shadcn UI (built on Radix UI primitives) + Tailwind CSS
  * **Rationale:** 
    * Accessible by default (WCAG 2.1 AA compliant components)
    * Copy-paste component architecture (no npm bloat)
    * Highly customizable with Tailwind utility classes
    * Excellent TypeScript support
    * Free and open-source
* **Design Methodology:** Atomic Design pattern
  * Atoms: Buttons, inputs, labels, icons
  * Molecules: Form fields with labels, search bars, status badges
  * Organisms: Customer profile cards, mail item lists, notification template previews
  * Templates: Page layouts with navigation, main content, and action panels
  * Pages: Intake view, Directory view, Templates view, Dashboard
* **UX Principles Applied:**
  * **Fitts's Law Implementation:** 
    * Primary action buttons (Add Mail, Save, Copy Template) sized at minimum 44x44px touch targets
    * High-frequency actions placed in consistent top-right positions
    * Critical "Save" and "Cancel" buttons positioned with adequate spacing (16px minimum)
  * **Hick's Law Application:** 
    * Mail intake form limited to 4 essential fields (date auto-filled)
    * Navigation menu reduced to 4 primary sections (Dashboard, Intake, Directory, Templates)
    * Customer search shows maximum 8 results initially with "Show More" option
  * **Miller's Rule Adherence:** 
    * Mail status options limited to 6 states (Pending, Notified, Picked Up, Scanned, Forwarded, Abandoned)
    * Dashboard widgets grouped into 3 categories (Today's Mail, Pending Actions, Recent Activity)
    * Customer profile fields chunked into 3 sections (Basic Info, Contact, Service Details)
  * **Jakob's Law Compliance:** 
    * Search functionality with magnifying glass icon in top-right (familiar pattern)
    * Forms follow left-aligned label convention with consistent spacing
    * Action buttons use familiar Gmail-style color scheme (Blue for primary, Red for destructive, Gray for secondary)
    * Navigation patterns mirror common CRM interfaces (left sidebar or top nav)
  * **Krug's Usability Principles:** 
    * Self-evident design: "Add Mail Item" button with + icon on intake screen
    * Eliminate ambiguity: Clear status labels instead of icons alone ("Notified ✓" not just "✓")
    * Minimal text: "Copy Template" not "Copy This Bilingual Template to Your Clipboard"
* **Accessibility Standard:** WCAG 2.1 AA compliance minimum
  * Keyboard navigation for all interactive elements
  * Focus indicators visible on all focusable elements
  * Color contrast ratio ≥4.5:1 for body text, ≥3:1 for large text
  * ARIA labels for icon-only buttons
  * Form validation with clear error messages
* **Responsive Strategy:** Desktop-first (optimized for 1366px-1920px), gracefully degrades to tablet (768px+)
  * Mobile support deferred to P1 (out of scope for MVP)
* **Information Architecture:** 
  * Primary Navigation (Top Bar or Left Sidebar):
    1. Dashboard (overview + quick actions)
    2. Mail Intake (add + search mail items)
    3. Customer Directory (mini CRM)
    4. Notification Templates (EN/中文 copy-paste templates)
  * Hierarchy: Dashboard as landing page → Task-specific views → Detail modals/pages
* **Color System:**
  * Primary: `#3B82F6` (Blue-500) - Action buttons, links, active states
  * Secondary: `#10B981` (Green-500) - Success states, "Picked Up" status
  * Neutral: `#6B7280` (Gray-500) - Body text, borders, disabled states
  * Warning: `#F59E0B` (Amber-500) - Overdue mail alerts
  * Destructive: `#EF4444` (Red-500) - Delete actions, "Abandoned" status
  * Background: `#F9FAFB` (Gray-50) - Page background
  * Surface: `#FFFFFF` (White) - Cards, modals, form containers
* **Typography:**
  * Heading Font Stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  * Body Font Stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  * Sizes: 
    * H1: 2rem (32px) - Page titles
    * H2: 1.5rem (24px) - Section headings
    * H3: 1.25rem (20px) - Card titles
    * Body: 1rem (16px) - Default text
    * Small: 0.875rem (14px) - Meta information, labels
  * Readability: Line height 1.5 for body text, 1.2 for headings; max content width 80ch

### **Security & Threat Model:**

* **Authentication:** 
  * Method: Supabase Auth (email/password with JWT tokens)
  * Implementation: 
    * JWT tokens stored in httpOnly cookies (not localStorage - XSS protection)
    * Access tokens expire after 1 hour
    * Refresh tokens expire after 24 hours (force re-login daily)
    * Backend validates JWT signature on every protected route
* **Authorization:** 
  * No RBAC for MVP (all authenticated users have full access)
  * Supabase Row Level Security (RLS) policies:
    * Users can only access data if authenticated (`auth.uid() IS NOT NULL`)
    * Future-proofing: RLS policies structured to support role-based rules in P1
* **Data Protection:**
  * Encryption at Rest: Supabase PostgreSQL uses AES-256 encryption (managed by Supabase)
  * Encryption in Transit: All connections use TLS 1.3 (HTTPS enforced)
  * Key Management: 
    * Supabase API keys stored in environment variables (never committed to Git)
    * `.env` files added to `.gitignore`
    * Production secrets managed via Vercel/Render environment variable UI
* **OWASP Top 10 Mitigations:**
  * **A01:2021 – Broken Access Control:**
    * Mitigation: Supabase RLS policies enforce data access control at database level
    * Backend middleware validates JWT on every protected route
    * Frontend redirects unauthenticated users to login page
  * **A02:2021 – Cryptographic Failures:**
    * Mitigation: TLS 1.3 for all data in transit
    * Supabase handles password hashing with bcrypt (cost factor 10)
    * No sensitive data stored in localStorage or sessionStorage
  * **A03:2021 – Injection:**
    * Mitigation: Prisma ORM uses parameterized queries (SQL injection protection)
    * Zod schema validation for all API inputs (type coercion + sanitization)
    * No raw SQL queries unless absolutely necessary (and parameterized if used)
  * **A04:2021 – Insecure Design:**
    * Mitigation: Threat modeling completed in Architect Phase
    * Security requirements defined before implementation
    * Rate limiting on authentication endpoints (10 attempts per 15 minutes)
  * **A05:2021 – Security Misconfiguration:**
    * Mitigation: CIS PostgreSQL Benchmark controls applied (see below)
    * Helmet.js sets secure HTTP headers (CSP, X-Frame-Options, HSTS)
    * CORS restricted to frontend domain only (no wildcard `*`)
    * Error messages sanitized (no stack traces in production)
  * **A06:2021 – Vulnerable and Outdated Components:**
    * Mitigation: Automated dependency scanning with `npm audit` in CI/CD
    * Dependabot enabled for automatic security patch PRs
    * Monthly manual review of dependencies
  * **A07:2021 – Identification and Authentication Failures:**
    * Mitigation: Supabase Auth enforces strong password policy (min 8 chars)
    * Session tokens expire after 24 hours
    * Account lockout after 10 failed login attempts (Supabase built-in)
  * **A08:2021 – Software and Data Integrity Failures:**
    * Mitigation: Subresource Integrity (SRI) for CDN resources
    * Code signing for production builds
    * Immutable deployment artifacts (Docker containers or static builds)
  * **A09:2021 – Security Logging and Monitoring Failures:**
    * Mitigation: Backend logs all authentication events (login, logout, failed attempts)
    * Error tracking with console logging (upgrade to Sentry in P1)
    * `log.md` file tracks all errors and solutions during development
  * **A10:2021 – Server-Side Request Forgery (SSRF):**
    * Mitigation: No user-provided URLs fetched by backend in MVP
    * Future (P2): If Gmail API integration added, validate and whitelist Gmail API endpoints only
* **CIS Benchmark Compliance:** CIS PostgreSQL 15 Benchmark v1.0
  * Key Controls Implemented:
    * **1.3:** Ensure PostgreSQL is not accessible from the internet (Supabase enforces private networking)
    * **2.1:** Ensure the 'log_connections' setting is enabled (Supabase default)
    * **2.2:** Ensure the 'log_disconnections' setting is enabled (Supabase default)
    * **3.1.2:** Ensure 'ssl' is enabled and set to 'on' (Supabase enforces TLS)
    * **6.2:** Ensure Row Level Security (RLS) is enabled on all user tables (implemented in migration)
    * **6.7:** Ensure the set of users with superuser privileges is minimized (no direct superuser access; Supabase manages)

## 3. High-level Task Breakdown (P0 Features Only)

**Priority Legend:**
- **P0** = Must-have MVP (tasks detailed below) - Target: 3 weeks
- **P1** = Should-have later (listed for future planning, no tasks generated)
- **P2** = Nice-to-have (listed for future planning, no tasks generated)

---

### **P0 (MVP) - Detailed Task Breakdown**

### Phase 0: Setup & Infrastructure

- [ ] **Task 1: Development Environment Setup & Security Hardening**
  - [ ] Initialize backend project (`backend/`) with Node.js, Express, TypeScript, Prisma
  - [ ] Initialize frontend project (`frontend/`) with React, TypeScript, Vite, Tailwind
  - [ ] Add and configure basic security middleware in backend:
    - [ ] `helmet`
    - [ ] `cors`
    - [ ] `express-rate-limit`
  - [ ] Configure `.env.development` files for backend + frontend and add `.env*` to `.gitignore`
  - [ ] Install testing libraries:
    - [ ] Backend: Jest + ts-jest + Supertest
    - [ ] Frontend: React Testing Library + Playwright (basic setup)
  - [ ] Configure Prisma to connect to Supabase Postgres and verify connection
  - [ ] Add basic npm scripts (`dev`, `test`, `build`) for both backend and frontend
  - [ ] Run a "Hello World" endpoint on backend and basic React page on frontend
  - **Success Criteria:**
    - Backend server runs on `http://localhost:5000` with "Server running" message
    - Frontend dev server runs on `http://localhost:3000` with React welcome screen
    - Prisma successfully connects to Supabase PostgreSQL and can run migrations
    - Environment variables loaded from `.env.development`
    - Security middleware (Helmet, CORS, rate limiting) configured
    - Unit test script runs successfully with sample passing test
    - Git repository initialized with `.gitignore` excluding `.env` files
  - **Testing Strategy:**
    - Configuration validation: Run `npm run dev` for both backend and frontend
    - Database connection test: Run `npx prisma db pull` to verify Supabase connection
    - Security test: Verify Helmet headers present in API response using cURL or Postman
  - **Estimated Time:** 3-4 hours

- [ ] **Task 2: Database Schema Design & Prisma Migration**
  - [ ] Design `User`, `Customer`, and `MailItem` models in `schema.prisma`
  - [ ] Add enums for mail type (LETTER/PACKAGE) and status (PENDING/NOTIFIED/PICKED_UP/SCANNED/FORWARDED/ABANDONED)
  - [ ] Run initial migration (`npx prisma migrate dev`) against Supabase
  - [ ] Generate Prisma Client and test a simple read/write script
  - [ ] Enable Row Level Security (RLS) on relevant Supabase tables
  - [ ] Define basic RLS policies so only authenticated users can read/write
  - [ ] Document schema briefly in `README.md` or in a short section in `plan.md`
  - **Success Criteria:**
    - Prisma schema file (`schema.prisma`) defines:
      - `User` model with id, email, created_at fields (Supabase Auth compatibility)
      - `Customer` model with id, name, company, email, phone, mailbox_number, language_preference, service_tier, notes, is_active, created_at, updated_at
      - `MailItem` model with id, customer_id (foreign key), mail_type (enum: LETTER/PACKAGE), received_date, status (enum: PENDING/NOTIFIED/PICKED_UP/SCANNED/FORWARDED/ABANDONED), notes, notified_at, picked_up_at, created_at, updated_at
    - Migration successfully applies to Supabase database (`npx prisma migrate dev`)
    - RLS policies enabled on all tables (users must be authenticated to read/write)
    - Prisma Client generated and importable in backend code
  - **Testing Strategy:**
    - Unit test: Verify Prisma Client can create, read, update, delete records in all tables
    - Security test: Attempt to query database without authentication (should fail via RLS)
    - Integration test: Verify foreign key constraints (deleting customer should cascade or restrict mail items)
  - **Estimated Time:** 3-4 hours

- [ ] **Task 3: Supabase Auth Integration & User Authentication API**
  - [ ] Configure Supabase Auth project (email/password sign-in)
  - [ ] Create backend Supabase client config file
  - [ ] Implement `POST /api/auth/login` endpoint:
    - [ ] Validate email + password with Supabase
    - [ ] On success, set JWT in httpOnly cookie
  - [ ] Implement `POST /api/auth/logout` endpoint to clear cookie
  - [ ] Implement `GET /api/auth/me` endpoint to return current user info
  - [ ] Add `authMiddleware` to validate JWT on protected routes
  - [ ] Add rate limiting to login route (e.g., 10 attempts per 15 minutes)
  - [ ] Add basic auth-related tests (happy path + invalid credentials)
  - **Success Criteria:**
    - `POST /api/auth/login` endpoint accepts email/password, validates via Supabase Auth, returns JWT in httpOnly cookie
    - `POST /api/auth/logout` endpoint clears authentication cookie
    - `GET /api/auth/me` endpoint returns current user info (requires valid JWT)
    - JWT validation middleware (`authMiddleware.ts`) verifies token signature and expiry
    - Rate limiting applied to login endpoint (10 attempts per 15 minutes per IP)
    - Failed login attempts logged with sanitized error messages (no user enumeration)
  - **Testing Strategy:**
    - Unit tests: 
      - Test successful login with valid credentials
      - Test login failure with invalid credentials
      - Test JWT validation with expired token
      - Test JWT validation with tampered token
    - Integration tests:
      - Test protected route access without token (should return 401)
      - Test protected route access with valid token (should return 200)
    - Security tests:
      - Verify httpOnly cookie flag set
      - Verify rate limiting triggers after 10 failed attempts
  - **Estimated Time:** 4-5 hours

---

### Phase 1: Core Backend Features

- [ ] **Task 4: Customer CRUD API Endpoints (Backend)**
  - [ ] Create Zod schemas for customer creation/update payloads
  - [ ] Implement `POST /api/customers` (create)
  - [ ] Implement `GET /api/customers` (list + search + filters)
  - [ ] Implement `GET /api/customers/:id` (read by ID)
  - [ ] Implement `PUT /api/customers/:id` (update)
  - [ ] Implement `DELETE /api/customers/:id` as a soft delete (`is_active = false`)
  - [ ] Add error handling + consistent JSON error responses
  - [ ] Write basic unit/integration tests for main happy paths + validation errors
  - **Success Criteria:**
    - All 5 CRUD endpoints functional and return correct HTTP status codes (201, 200, 204, 404, 400)
    - `GET /api/customers` supports query parameters: `?search=` (name/company/mailbox_number), `?language=` (EN/ZH), `?service_tier=`, `?is_active=`
    - Zod schemas validate required fields (name, email, mailbox_number) and data types
    - Prisma queries use parameterized inputs (SQL injection protection)
    - Soft delete implemented (DELETE sets `is_active=false` instead of removing record)
    - Error handling returns consistent JSON error responses with sanitized messages
  - **Testing Strategy:**
    - Unit tests for each CRUD operation (create customer, list customers, get customer by ID, update customer, soft delete)
    - Integration tests:
      - Create customer → Retrieve customer → Verify data matches
      - Search functionality: Query by name, company, mailbox number
      - Soft delete: Verify deleted customer excluded from default list query
    - Validation tests: Send invalid payloads (missing required fields, wrong data types) and verify 400 errors
  - **Estimated Time:** 5-6 hours

- [ ] **Task 5: Mail Item CRUD API Endpoints (Backend)**
  - [ ] Create Zod schemas for mail item creation/update/status change
  - [ ] Implement `POST /api/mail-items` to create + link to `Customer`
  - [ ] Implement `GET /api/mail-items` with filters (customer, status, date range, type)
  - [ ] Implement `GET /api/mail-items/:id` (detail)
  - [ ] Implement `PATCH /api/mail-items/:id/status` with status transition rules
  - [ ] Automatically set `notified_at` and `picked_up_at` when status changes
  - [ ] Ensure responses include basic customer info for list views
  - [ ] Add integration tests for:
    - [ ] Creating mail item with valid customer
    - [ ] Status updates and timestamp behavior
    - [ ] Filtering by status and date
  - **Success Criteria:**
    - All endpoints functional with correct HTTP status codes
    - `POST /api/mail-items` requires `customer_id` and validates customer exists in database
    - `GET /api/mail-items` supports filters: `?customer_id=`, `?status=`, `?mail_type=`, `?received_date_from=`, `?received_date_to=`
    - `PATCH /api/mail-items/:id/status` automatically sets:
      - `notified_at` timestamp when status changes to NOTIFIED
      - `picked_up_at` timestamp when status changes to PICKED_UP
    - Zod validation for status transitions (can't go from PICKED_UP back to PENDING)
    - Responses include related customer data (joined query) for easy display
  - **Testing Strategy:**
    - Unit tests: CRUD operations for mail items
    - Integration tests:
      - Create mail item → Verify customer foreign key constraint
      - Update status to NOTIFIED → Verify `notified_at` auto-populated
      - Update status to PICKED_UP → Verify `picked_up_at` auto-populated
      - Filter by status, customer, date range
    - Validation tests: Invalid customer_id, invalid status transitions
  - **Estimated Time:** 5-6 hours

---

### Phase 2: Core Frontend Features

- [ ] **Task 6: Frontend Authentication (Login/Logout)**
  - [ ] Create `/login` page with email/password form (desktop-first)
  - [ ] Add client-side validation (required fields, email format)
  - [ ] Connect login form to backend `POST /api/auth/login`
  - [ ] Implement `AuthContext` (or similar) to store `user` + `isAuthenticated`
  - [ ] Implement protected routes (redirect unauthenticated users to `/login`)
  - [ ] Add logout button that calls `POST /api/auth/logout` and clears auth state
  - [ ] Add basic tests for:
    - [ ] Rendering login form
    - [ ] Successful login → redirect to dashboard
    - [ ] Protection of a private route
  - **Success Criteria:**
    - Login page at `/login` with email and password input fields
    - Form validation (email format, password minimum 8 characters)
    - Successful login redirects to `/dashboard`
    - Failed login displays error message (e.g., "Invalid credentials")
    - Authentication context (`AuthContext.tsx`) provides `user`, `login()`, `logout()`, `isAuthenticated` to all components
    - Protected routes redirect unauthenticated users to `/login`
    - Logout button clears authentication and redirects to login
    - Loading states during login API call (disable button, show spinner)
  - **Testing Strategy:**
    - Unit tests (React Testing Library):
      - Render login form
      - Simulate form submission with valid credentials
      - Verify redirect after successful login
    - Integration tests:
      - Mock API login response → Verify context state updated
      - Test protected route access before/after login
    - E2E test (Playwright):
      - Navigate to app → Redirected to login
      - Enter credentials → Click login → Verify dashboard loads
  - **Estimated Time:** 4-5 hours

- [ ] **Task 7: Customer Directory UI (List, Search, Create, Edit)**
  - [ ] Create `/customers` page layout
  - [ ] Implement customer list view using data from `GET /api/customers`
  - [ ] Add search bar (by name, company, mailbox number)
  - [ ] Add simple filters (e.g., active/inactive, language preference)
  - [ ] Build "Add Customer" modal with form and validation
  - [ ] Connect "Add Customer" form to `POST /api/customers`
  - [ ] Implement "Edit Customer" flow (click card/row → open modal → `PUT /api/customers/:id`)
  - [ ] Show toast notifications on success/error
  - [ ] Add an empty state message when no customers exist
  - **Success Criteria:**
    - Customer Directory page at `/customers` displays list of all active customers
    - Search bar filters customers by name, company, or mailbox number (real-time client-side filtering or debounced API call)
    - Filter dropdowns for language preference and service tier
    - "Add Customer" button opens modal with form (name, company, email, phone, mailbox_number, language_preference, service_tier, notes)
    - Form validation: Required fields (name, mailbox_number), email format, phone format (optional)
    - Successful creation closes modal, refreshes customer list, shows success toast notification
    - Click customer card → Opens edit modal with pre-filled form
    - Edit form updates customer via `PUT /api/customers/:id`
    - Empty state message when no customers exist ("No customers yet. Add your first customer.")
  - **Testing Strategy:**
    - Unit tests:
      - Render customer list with mock data
      - Test search filter logic
      - Test form validation (required fields, email format)
    - Integration tests:
      - Create customer → Verify API called with correct payload → Verify customer appears in list
      - Edit customer → Verify API called → Verify customer data updated in list
    - E2E test (Playwright):
      - Login → Navigate to Customers → Add customer → Verify customer appears → Edit customer → Verify changes saved
  - **Estimated Time:** 6-7 hours

- [ ] **Task 8: Mail Intake UI (Add Mail Item, Link to Customer)**
  - [ ] Create `/intake` page layout
  - [ ] Implement mail intake form:
    - [ ] Customer search field with typeahead (calls `GET /api/customers?search=`)
    - [ ] Mail type dropdown (Letter/Package)
    - [ ] Auto-filled "today" date (editable)
    - [ ] Optional notes field
  - [ ] Add "Can't find customer?" link to open "Add Customer" modal (reuse from Task 7)
  - [ ] Connect form to `POST /api/mail-items`
  - [ ] Show success toast + option to quickly add another mail item
  - [ ] Add minimal tests for:
    - [ ] Rendering form
    - [ ] Submitting valid data
    - [ ] Handling missing required fields
  - **Success Criteria:**
    - Mail Intake page at `/intake` with "Add Mail Item" form
    - Customer search field with typeahead/autocomplete (searches by name, company, mailbox number as user types)
    - Customer search displays results in dropdown (max 8 results, show "Show More" if more exist)
    - Selected customer displays confirmation (name + mailbox number shown above form)
    - "Can't find customer?" link opens "Add Customer" modal (reuse component from Task 7)
    - Mail type dropdown: Letter or Package
    - Received date field auto-filled with today's date (editable)
    - Optional notes textarea
    - "Save Mail Item" button submits form to `POST /api/mail-items`
    - Success → Form resets, success toast notification, option to "Add Another" or "Go to Dashboard"
    - Form validation: Customer required, mail type required
  - **Testing Strategy:**
    - Unit tests:
      - Render intake form
      - Test customer search functionality (mock API response)
      - Test form validation (missing customer, missing mail type)
    - Integration tests:
      - Create mail item → Verify API called with correct customer_id and mail data
      - Create mail item with new customer → Verify customer created first, then mail item linked
    - E2E test (Playwright):
      - Login → Navigate to Intake → Search customer → Select customer → Fill form → Submit → Verify success message
  - **Estimated Time:** 6-7 hours

- [ ] **Task 9: Mail Item Status Tracking UI (List, Update Status)**
  - [ ] Create `/mail-items` page layout
  - [ ] Display mail items list/table with:
    - [ ] Customer name + mailbox number
    - [ ] Mail type
    - [ ] Received date
    - [ ] Current status badge
  - [ ] Add filters (status, mail type, maybe date range)
  - [ ] Add search by customer name / mailbox number
  - [ ] Implement "Update Status" control that calls `PATCH /api/mail-items/:id/status`
  - [ ] Add "View details" modal to show notes + timestamps
  - [ ] Show toast notifications on status change
  - [ ] Add basic tests for:
    - [ ] Status filter behavior
    - [ ] Status update → UI refresh
  - **Success Criteria:**
    - Mail Items page at `/mail-items` displays list of all mail items (sorted by received date, newest first)
    - Status badges with color coding:
      - PENDING (gray)
      - NOTIFIED (blue)
      - PICKED_UP (green)
      - SCANNED (purple)
      - FORWARDED (orange)
      - ABANDONED (red)
    - Filter dropdowns: Status, Mail Type, Date Range (optional)
    - Quick search by customer name or mailbox number
    - Each mail item row shows:
      - Customer name + mailbox number (clickable link to customer profile)
      - Mail type icon (letter/package)
      - Received date
      - Current status badge
      - "Update Status" dropdown button with status options
    - Selecting new status from dropdown triggers `PATCH /api/mail-items/:id/status` API call
    - Success → Status badge updates immediately, success toast notification
    - "View Details" button opens mail item detail modal with full notes and timestamps
  - **Testing Strategy:**
    - Unit tests:
      - Render mail items list with mock data
      - Test status filter logic
      - Test customer search filter
    - Integration tests:
      - Update status → Verify API called → Verify status badge updates in UI
      - Filter by status NOTIFIED → Verify only notified items displayed
    - E2E test (Playwright):
      - Login → Navigate to Mail Items → Filter by PENDING → Update status to NOTIFIED → Verify status changed
  - **Estimated Time:** 5-6 hours

- [ ] **Task 10: Bilingual Notification Templates UI (Copy-Paste Workflow)**
  - [ ] Create `/templates` page layout
  - [ ] Hard-code initial EN/中文 templates for:
    - [ ] New mail (letter)
    - [ ] New mail (package)
    - [ ] Reminder after 1 week
    - [ ] Final notice
    - [ ] Contract/form send-out
  - [ ] Implement template detail view with:
    - [ ] English text
    - [ ] Chinese text
    - [ ] "Copy English" + "Copy 中文" buttons
  - [ ] Implement placeholder replacement (e.g. `{CUSTOMER_NAME}`, `{MAILBOX_NUMBER}`, `{MAIL_TYPE}`, `{RECEIVED_DATE}`)
  - [ ] Add integration from mail items page:
    - [ ] e.g. "Notify" button → open template pre-filled with selected mail item
  - [ ] Show toast on successful "Copy to Clipboard"
  - [ ] Add simple tests for placeholder replacement + copy logic (mock clipboard)
  - **Success Criteria:**
    - Templates page at `/templates` displays list of template categories:
      - New Mail Arrival (Letter)
      - New Mail Arrival (Package)
      - Reminder for Uncollected Mail (1 week)
      - Final Notice for Unclaimed Mail
      - Contract/Form Send-Out
      - General Update
    - Each template shows:
      - Template name
      - English version (left column)
      - Chinese version (right column)
      - "Copy English" and "Copy 中文" buttons
    - When user selects a mail item (via `/mail-items` page "Notify" button or quick action), template page pre-fills placeholders:
      - `{CUSTOMER_NAME}` → Customer's name
      - `{MAILBOX_NUMBER}` → Customer's mailbox number
      - `{MAIL_TYPE}` → "letter" or "package"
      - `{RECEIVED_DATE}` → Formatted date (e.g., "November 17, 2025")
    - "Copy to Clipboard" button copies template text with placeholders replaced
    - Success toast notification: "Template copied! Paste into your email client."
    - After copying, user manually opens Gmail and pastes
    - Return to mail items page and mark status as "Notified"
  - **Testing Strategy:**
    - Unit tests:
      - Render templates list
      - Test placeholder replacement logic (mock customer data)
      - Test copy to clipboard functionality (mock `navigator.clipboard.writeText`)
    - Integration tests:
      - Select mail item → Open template → Verify placeholders replaced correctly → Copy template → Verify clipboard contains correct text
    - E2E test (Playwright):
      - Login → Navigate to Mail Items → Click "Notify" on mail item → Verify template page opens with pre-filled data → Click "Copy English" → Verify success toast
  - **Estimated Time:** 4-5 hours

- [ ] **Task 11: Dashboard Overview Page (Quick Stats & Pending Actions)**
  - [ ] Create `/dashboard` page layout (default after login)
  - [ ] Add metric cards:
    - [ ] "Today's Mail" (received today)
    - [ ] "Pending Notifications" (status = PENDING)
    - [ ] "Awaiting Pickup" (status = NOTIFIED)
  - [ ] Add quick action buttons:
    - [ ] "Add Mail Item" → `/intake`
    - [ ] "View All Mail" → `/mail-items`
    - [ ] "Add Customer" → open customer modal
  - [ ] Add recent activity list (latest mail items or status changes)
  - [ ] Optionally highlight overdue items (e.g., NOTIFIED > 7 days)
  - [ ] Add minimal tests for metric calculations (using mocked API responses)
  - **Success Criteria:**
    - Dashboard page at `/dashboard` (default landing page after login)
    - Metrics cards (3-column layout):
      - "Today's Mail" → Count of mail items received today
      - "Pending Notifications" → Count of mail items with status PENDING
      - "Awaiting Pickup" → Count of mail items with status NOTIFIED (not yet picked up)
    - Quick action buttons:
      - "Add Mail Item" → Navigates to `/intake`
      - "View All Mail" → Navigates to `/mail-items`
      - "Add Customer" → Opens add customer modal
    - Recent activity feed (last 10 mail items or status changes):
      - Display customer name, mail type, status, timestamp
      - Clickable to open mail item detail modal
    - Overdue mail alert (optional P0 feature):
      - Show warning banner if any mail items have been "Notified" for >7 days without pickup
  - **Testing Strategy:**
    - Unit tests:
      - Render dashboard with mock data
      - Verify metrics calculations (count pending, notified, today's mail)
    - Integration tests:
      - Fetch dashboard data from API → Verify metrics displayed correctly
      - Click quick action button → Verify navigation or modal opens
    - E2E test (Playwright):
      - Login → Verify dashboard loads with metrics → Click "Add Mail Item" → Verify intake page opens
  - **Estimated Time:** 4-5 hours

---

### Phase 3: Deploy, Test & Polish

- [ ] **Task 12: Production Deployment & Environment Configuration**
  - [ ] Create production Supabase project (separate from dev)
  - [ ] Configure production database + run Prisma migrations (`migrate deploy`)
  - [ ] Deploy backend (e.g., Render/Railway) and verify health check
  - [ ] Deploy frontend (Vercel) and point it to production API URL
  - [ ] Configure CORS for production domains
  - [ ] Configure environment variables in hosting dashboards (Supabase keys, DB URL, JWT secret, etc.)
  - [ ] Manually test core flows in production: login, customers, mail items, templates
  - **Success Criteria:**
    - Frontend deployed to Vercel with custom domain or Vercel subdomain (e.g., `meiway-mail.vercel.app`)
    - Backend deployed to Render.com with public API URL (e.g., `https://meiway-mail-api.onrender.com`)
    - Environment variables configured in Vercel and Render dashboards:
      - `DATABASE_URL` (Supabase production connection string)
      - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
      - `JWT_SECRET` (production secret)
      - `FRONTEND_URL` (for CORS configuration)
    - CORS middleware updated to allow requests from production frontend domain
    - HTTPS enforced (automatic with Vercel and Render)
    - Production Supabase project created with separate database from development
    - Prisma migrations applied to production database (`npx prisma migrate deploy`)
    - Smoke tests in production:
      - Login works
      - Customer CRUD operations work
      - Mail item CRUD operations work
      - Templates copy to clipboard
  - **Testing Strategy:**
    - Manual smoke tests in production environment
    - E2E test (Playwright) run against production URLs
    - Security verification:
      - Verify HTTPS enforced (HTTP redirects to HTTPS)
      - Verify CORS headers present and restrictive
      - Verify no `.env` files or secrets exposed in Git repository
  - **Estimated Time:** 4-5 hours

- [ ] **Task 13: End-to-End Testing & Bug Fixes**
  - [ ] Write Playwright E2E tests for:
    - [ ] Login → Dashboard
    - [ ] Add customer → see in directory → edit customer
    - [ ] Intake mail → notify → update status → mark picked up
    - [ ] Use template and copy bilingual text
  - [ ] Run full test suite (unit + integration + E2E)
  - [ ] Fix any blocking bugs discovered during testing
  - [ ] Smoke test with Madison & Merlin style usage (simulate their daily flow)
  - [ ] Update `log.md` with any major errors + how they were solved
  - **Success Criteria:**
    - E2E test suite covers:
      - Full authentication flow (login → logout)
      - Customer lifecycle (add → search → edit → soft delete)
      - Mail item lifecycle (intake → link customer → notify → update status → pickup)
      - Template copy-paste workflow
      - Dashboard metrics accuracy
    - All E2E tests pass (≥95% pass rate, flaky tests isolated and documented)
    - No critical bugs blocking core workflows
    - All P0 acceptance criteria validated
    - `log.md` updated with any errors encountered and solutions applied
  - **Testing Strategy:**
    - Playwright test suite with headless browser execution
    - Run tests in CI/CD pipeline (GitHub Actions)
    - Manual exploratory testing for edge cases
  - **Estimated Time:** 5-6 hours

---

### **Total Estimated Time for P0:** ~60-70 hours (within 3-week timeline with 25 hours/week)

---

### **P1 Features (Should-Have Later - No Tasks Generated)**

**Post-MVP enhancements to improve user experience and reduce manual work further. Estimated for Weeks 4-6 after MVP launch.**

1. **Advanced Notification Features:**
   - Gmail API integration for direct email sending from the app (replaces copy-paste workflow)
   - Automatic email logging (track when notifications were sent without manual status update)
   - Email templates with rich text editor for customization

2. **Automated Reminders & Alerts:**
   - Dashboard "tickler" system showing overdue mail items (>7 days since notification)
   - Automated reminder notifications to staff (daily digest of pending actions)
   - Customer-facing automated reminders (if Gmail API integrated)

3. **Enhanced Customer Management:**
   - Customer timeline view (chronological list of all mail items, notifications, status changes)
   - Customer activity tags/filters (Active, Inactive, VIP)
   - Customer notes section for internal staff comments

4. **To-Do List & Task Management:**
   - Staff-specific to-do lists (Madison vs. Merlin tasks)
   - Task assignment and completion tracking
   - Deadline/reminder system for follow-ups

5. **Reporting & Analytics:**
   - End-of-day summary reports (mail intake count, notifications sent, pickups completed)
   - Weekly summary emails (automated digest of mail activity)
   - Customer activity reports (most active customers, unclaimed mail trends)

6. **UI/UX Enhancements:**
   - Switchable EN/中文 UI using `react-i18next`
   - Dark mode support
   - Mobile-responsive layout (tablet and phone support)

7. **Lead Tracking (Simple CRM Extension):**
   - "Leads" section for potential new customers
   - Track proposal sent date, follow-up reminders, conversion status
   - Integration with customer creation (convert lead → customer)

8. **Service Tier Automation (P1 → P2):**
   - Structured tier system with rule enforcement
   - Automatic fee calculations for overdue packages (Tier 1 vs. Tier 2 rules)
   - Alert when Tier 1 customer receives package (policy violation)

---

### **P2 Features (Nice-to-Have Future - No Tasks Generated)**

**Long-term enhancements for scaling and advanced automation. Estimated for Month 3+ after MVP launch.**

1. **Photo Upload & Storage:**
   - Supabase Storage integration for package photos and signature images
   - OCR (Optical Character Recognition) for automatic label data extraction
   - Photo gallery view for each mail item

2. **Form 1583 E-Signature Workflow:**
   - Digital form tracking for USPS Form 1583 (mail forwarding authorization)
   - ID upload and storage (driver's license, passport)
   - E-signature capture and storage
   - Compliance tracking (form expiration reminders)

3. **Payment Integration:**
   - Manual fee tracking (storage fees, forwarding fees) in customer profile
   - Payment status (Paid, Pending, Overdue)
   - Future: Stripe or PayPal integration for online payments

4. **WeChat/WhatsApp Integration:**
   - Omnichannel messaging (send notifications via WeChat API)
   - Unified inbox for customer messages (email, WeChat, SMS)
   - Message templates for WeChat (bilingual support)

5. **Consignment Business Integration:**
   - Separate module for consignment item tracking
   - eBay/Etsy listing automation (draft creation, photo upload)
   - Pricing suggestion tools
   - Consignment contract generation

6. **Advanced Analytics Dashboard:**
   - Revenue tracking (mail fees, consignment sales)
   - Customer lifetime value (CLV) analysis
   - Predictive analytics (mail volume forecasting, peak days)

7. **Multi-Location Support:**
   - Support for multiple Mei Way Mail Plus locations (if business expands)
   - Location-based filtering and reporting
   - Inter-location mail transfers

8. **API & Integrations:**
   - Public API for third-party integrations
   - Zapier integration for workflow automation
   - Google Sheets export for legacy compatibility

---

## 4. Project File Structure

```
mei-way-mail-plus/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD pipeline
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts           # Prisma client initialization
│   │   │   └── supabase.ts           # Supabase client configuration
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts     # JWT validation middleware
│   │   │   ├── errorHandler.ts       # Global error handling middleware
│   │   │   ├── rateLimiter.ts        # Rate limiting middleware
│   │   │   └── validation.ts         # Zod schema validation middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.ts        # Authentication endpoints (login, logout, me)
│   │   │   ├── customers.routes.ts   # Customer CRUD endpoints
│   │   │   ├── mailItems.routes.ts   # Mail item CRUD endpoints
│   │   │   └── index.ts              # Route aggregator
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts    # Authentication logic
│   │   │   ├── customers.controller.ts # Customer business logic
│   │   │   └── mailItems.controller.ts # Mail item business logic
│   │   ├── services/
│   │   │   ├── auth.service.ts       # Supabase Auth integration
│   │   │   ├── customers.service.ts  # Customer database operations
│   │   │   └── mailItems.service.ts  # Mail item database operations
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts        # Zod schemas for authentication
│   │   │   ├── customers.schema.ts   # Zod schemas for customer validation
│   │   │   └── mailItems.schema.ts   # Zod schemas for mail item validation
│   │   ├── types/
│   │   │   ├── express.d.ts          # Extended Express Request type (user payload)
│   │   │   └── index.ts              # Shared TypeScript types
│   │   ├── utils/
│   │   │   ├── logger.ts             # Logging utility (console or Winston)
│   │   │   └── errorMessages.ts      # Sanitized error message constants
│   │   ├── app.ts                    # Express app configuration (middleware, routes)
│   │   └── server.ts                 # Server entry point (port listener)
│   ├── prisma/
│   │   ├── schema.prisma             # Prisma schema definition
│   │   ├── migrations/               # Database migration files
│   │   └── seed.ts                   # Seed script for development data (optional)
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── customers.test.ts     # Unit tests for customer service
│   │   │   └── mailItems.test.ts     # Unit tests for mail item service
│   │   ├── integration/
│   │   │   ├── auth.test.ts          # Integration tests for auth endpoints
│   │   │   ├── customers.test.ts     # Integration tests for customer API
│   │   │   └── mailItems.test.ts     # Integration tests for mail item API
│   │   └── setup.ts                  # Test environment setup (database cleanup)
│   ├── .env.development              # Development environment variables (gitignored)
│   ├── .env.example                  # Example environment variables template
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn UI components (Button, Input, Modal, etc.)
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx        # Top navigation bar
│   │   │   │   ├── Sidebar.tsx       # Side navigation (optional)
│   │   │   │   └── Layout.tsx        # Main layout wrapper
│   │   │   ├── auth/
│   │   │   │   └── LoginForm.tsx     # Login form component
│   │   │   ├── customers/
│   │   │   │   ├── CustomerList.tsx  # Customer directory list
│   │   │   │   ├── CustomerCard.tsx  # Customer card component
│   │   │   │   ├── CustomerForm.tsx  # Add/Edit customer form (modal)
│   │   │   │   └── CustomerSearch.tsx # Customer search bar
│   │   │   ├── mailItems/
│   │   │   │   ├── MailItemList.tsx  # Mail items list view
│   │   │   │   ├── MailItemCard.tsx  # Mail item card component
│   │   │   │   ├── MailIntakeForm.tsx # Add mail item form
│   │   │   │   ├── StatusBadge.tsx   # Status badge component
│   │   │   │   └── StatusUpdateDropdown.tsx # Quick status update
│   │   │   ├── templates/
│   │   │   │   ├── TemplateList.tsx  # Notification templates list
│   │   │   │   └── TemplateCard.tsx  # Template card with copy button
│   │   │   └── dashboard/
│   │   │       ├── MetricsCard.tsx   # Dashboard metrics widget
│   │   │       └── RecentActivity.tsx # Recent activity feed
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx         # Login page
│   │   │   ├── DashboardPage.tsx     # Dashboard landing page
│   │   │   ├── CustomersPage.tsx     # Customer directory page
│   │   │   ├── MailIntakePage.tsx    # Mail intake page
│   │   │   ├── MailItemsPage.tsx     # Mail items list page
│   │   │   └── TemplatesPage.tsx     # Notification templates page
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Authentication context provider
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            # Authentication hook
│   │   │   ├── useCustomers.ts       # React Query hook for customers
│   │   │   └── useMailItems.ts       # React Query hook for mail items
│   │   ├── services/
│   │   │   ├── api.ts                # Axios instance configuration
│   │   │   ├── authService.ts        # Authentication API calls
│   │   │   ├── customersService.ts   # Customer API calls
│   │   │   └── mailItemsService.ts   # Mail item API calls
│   │   ├── utils/
│   │   │   ├── formatters.ts         # Date, phone, email formatters
│   │   │   ├── validators.ts         # Client-side validation helpers
│   │   │   └── constants.ts          # Status enums, template data, etc.
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript types (Customer, MailItem, etc.)
│   │   ├── styles/
│   │   │   └── globals.css           # Global Tailwind styles
│   │   ├── App.tsx                   # Main app component (routing)
│   │   ├── index.tsx                 # React entry point
│   │   └── vite-env.d.ts             # Vite environment types
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── components/           # Component unit tests
│   │   │   └── hooks/                # Custom hook tests
│   │   ├── integration/
│   │   │   └── pages/                # Page integration tests
│   │   └── e2e/
│   │       ├── auth.spec.ts          # E2E auth flow test
│   │       ├── customers.spec.ts     # E2E customer CRUD test
│   │       ├── mailItems.spec.ts     # E2E mail item workflow test
│   │       └── playwright.config.ts  # Playwright configuration
│   ├── .env.development              # Frontend environment variables (gitignored)
│   ├── .env.example                  # Example frontend env vars
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                # Vite configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   ├── postcss.config.js             # PostCSS configuration
│   └── README.md
├── plan.md                           # This file (project plan)
├── log.md                            # Error log (empty initially)
├── README.md                         # Project overview and setup instructions
└── .gitignore                        # Root gitignore
```

---

## 5. Security Checklist (Pre-Deployment Validation)

Before moving to production, verify all items checked:

- [ ] All environment variables stored securely (not committed to Git)
- [ ] Supabase Row Level Security (RLS) policies enabled on all tables
- [ ] JWT tokens stored in httpOnly cookies (not localStorage)
- [ ] CORS restricted to frontend domain only (no wildcard `*`)
- [ ] Helmet.js configured with secure HTTP headers
- [ ] Rate limiting applied to authentication endpoints
- [ ] Input validation with Zod on all API endpoints
- [ ] Prisma ORM using parameterized queries (no raw SQL)
- [ ] Error messages sanitized (no stack traces in production)
- [ ] HTTPS enforced on both frontend and backend
- [ ] Dependency audit clean (`npm audit` shows no high/critical vulnerabilities)
- [ ] Session timeout configured (24-hour max)
- [ ] Password policy enforced (minimum 8 characters, via Supabase Auth)
- [ ] Failed login attempts logged
- [ ] Database backups configured (Supabase automatic backups enabled)

---

## 6. Success Metrics & Post-MVP Evaluation

**6-Week Post-Launch Targets (from PRD):**

| Goal | Metric | Target |
|------|--------|--------|
| **Operational Efficiency** | Average time from mail arrival to notification sent | < 10 minutes per mail item |
| **Organization & Follow-Up** | % of mail items fully logged and linked to customers | ≥ 85% |
| **Team Adoption** | Daily active users (Mon-Sun) | ≥ 2 active users/day consistently |
| **Communication Consistency** | % of messages sent using pre-written bilingual templates | ≥ 80% |

**Measurement Plan:**
- Backend logging of mail item creation timestamps and status change timestamps
- Dashboard analytics showing daily active users (simple login tracking)
- Survey Madison and Merlin at Week 6 for qualitative feedback
- Review `log.md` for unresolved errors or friction points

---

## 7. Next Steps & Phase Transition

**Architect Phase is now complete.** 

The development blueprint, security model, task breakdown, and file structure are documented above. All architectural decisions align with S.A.F.E. D.R.Y. principles:

- **Strategic:** Threat model defined, CIS Benchmarks and OWASP Top 10 mitigations planned
- **Automated:** Testing strategy covers unit, integration, and E2E tests
- **Fortified:** Security controls embedded in every layer (auth, database, API, frontend)
- **Evolving:** `log.md` system ready to capture errors and solutions
- **DRY:** Reusable components, services, and validation schemas planned
- **Resilient:** Deployment strategy ensures uptime with free-tier cloud hosting
- **Your-Focused:** UX principles applied (Fitts, Hick, Miller, Jakob, Krug's laws) for intuitive design

---

**🎯 Phase Completion Statement:**

**"Architect Phase complete. The development blueprint is documented in `plan.md`. After a successful `git add`, `commit`, and `push`, you may proceed. To continue, type the command: `Activate Designer Mode`."**

