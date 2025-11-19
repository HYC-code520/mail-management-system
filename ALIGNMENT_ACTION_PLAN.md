# Alignment Action Plan: Current → Plan.md

**Purpose:** Close the gap between current implementation and plan.md requirements  
**Timeline:** 1-2 weeks (15-20 hours)  
**Priority:** Focus on security, missing features, and testing

---

## Phase 1: Security Hardening (Priority 🔴 HIGH)

**Estimated Time:** 4-5 hours

### Task 1.1: Verify and Enable Row Level Security (RLS)
- [ ] **Check current RLS status**
  ```bash
  # Run in Supabase SQL editor
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public';
  ```
- [ ] **Enable RLS on all tables if not enabled**
  - Tables: `contacts`, `mail_items`, `outreach_messages`, `message_templates`
  - File: `/scripts/simple_reset_rebuild.sql` (already has RLS setup)
- [ ] **Add authentication policies**
  ```sql
  -- Example policy for contacts table
  CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can create own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  ```
- [ ] **Test RLS policies**
  - Try accessing data without authentication (should fail)
  - Try accessing another user's data (should fail)

**Files to modify:**
- Create: `/scripts/enable_rls_policies.sql`
- Update: `/docs/SECURITY_AUDIT.md` (document RLS status)

---

### Task 1.2: Add Rate Limiting to Authentication
- [ ] **Install rate limiting package**
  ```bash
  npm install @upstash/ratelimit @upstash/redis
  # OR use Vercel's built-in rate limiting
  npm install @vercel/rate-limit
  ```
- [ ] **Create rate limiting middleware**
  - File: Create `/utils/rate-limit.ts`
  - Limit: 10 login attempts per 15 minutes per IP
- [ ] **Apply to auth endpoints**
  - If using custom auth: `/app/api/auth/*/route.ts`
  - Document Supabase Auth built-in rate limiting

**Files to create:**
- `/utils/rate-limit.ts`
- `/app/api/auth/login/route.ts` (if custom auth needed)

**Example Implementation:**
```typescript
// utils/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  analytics: true,
});
```

---

### Task 1.3: Security Audit Checklist
- [ ] **Environment variables**
  - Verify `.env` files not in Git
  - Check `.gitignore` includes `.env*`
  - Verify no secrets in code
- [ ] **API endpoint validation**
  - Add input validation (Zod schemas) to all API routes
  - Verify error messages don't expose sensitive info
- [ ] **Document security status**
  - Create `/docs/SECURITY_AUDIT.md`
  - List all implemented security controls

**Files to create:**
- `/docs/SECURITY_AUDIT.md`

---

## Phase 2: Database Schema Updates (Priority 🟡 MEDIUM)

**Estimated Time:** 2-3 hours

### Task 2.1: Add Missing Timestamps to Mail Items
- [ ] **Add `notified_at` column**
  ```sql
  ALTER TABLE mail_items 
  ADD COLUMN notified_at TIMESTAMPTZ;
  ```
- [ ] **Update API to auto-set timestamp**
  - When status changes to "Notified", set `notified_at`
  - File: `/app/api/mail-items/[id]/route.ts`

**Files to modify:**
- Create: `/scripts/add_notified_at_column.sql`
- Update: `/app/api/mail-items/[id]/route.ts`
- Update: `/types/mei-way.ts` (add `notified_at` field)

---

### Task 2.2: Expand Mail Item Status Enum
- [ ] **Add missing status options**
  - Current: Received, Notified, Picked Up, Returned
  - Add: Scanned, Forwarded, Abandoned
- [ ] **Update database constraint**
  ```sql
  ALTER TABLE mail_items 
  DROP CONSTRAINT IF EXISTS mail_items_status_check;
  
  ALTER TABLE mail_items 
  ADD CONSTRAINT mail_items_status_check 
  CHECK (status IN ('Received', 'Notified', 'Picked Up', 'Returned', 
                    'Scanned', 'Forwarded', 'Abandoned'));
  ```
- [ ] **Update TypeScript types**
  - File: `/types/mei-way.ts`

**Files to modify:**
- Create: `/scripts/expand_status_enum.sql`
- Update: `/types/mei-way.ts`
- Update: `/app/api/mail-items/*/route.ts`
- Update: UI components to show new statuses

---

## Phase 3: Testing Infrastructure (Priority 🟡 MEDIUM)

**Estimated Time:** 5-6 hours

### Task 3.1: Set Up Testing Framework
- [ ] **Install testing libraries**
  ```bash
  npm install -D jest @testing-library/react @testing-library/jest-dom \
                    @testing-library/user-event jest-environment-jsdom \
                    @types/jest
  ```
- [ ] **Configure Jest**
  - Create: `jest.config.js`
  - Create: `jest.setup.js`
- [ ] **Add test scripts to package.json**
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
  ```

**Files to create:**
- `jest.config.js`
- `jest.setup.js`

---

### Task 3.2: Write Unit Tests (Start Small)
- [ ] **Test utility functions**
  - Create: `/utils/__tests__/helpers.test.ts`
  - Test date formatters, validators
- [ ] **Test React components**
  - Create: `/components/__tests__/Button.test.tsx`
  - Test basic rendering and interactions
- [ ] **Test API route handlers**
  - Create: `/app/api/__tests__/contacts.test.ts`
  - Test CRUD operations with mocked Supabase

**Target Coverage:** Start with 50%, aim for 80% eventually

---

### Task 3.3: Set Up E2E Testing (Optional)
- [ ] **Install Playwright**
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```
- [ ] **Write critical user flow tests**
  - Create: `/e2e/auth.spec.ts` (login flow)
  - Create: `/e2e/mail-intake.spec.ts` (add mail item)
  - Create: `/e2e/customer-crud.spec.ts` (customer management)

**Files to create:**
- `playwright.config.ts`
- `/e2e/*.spec.ts`

---

## Phase 4: Feature Completeness (Priority 🟢 LOW)

**Estimated Time:** 3-4 hours

### Task 4.1: Verify Bilingual Templates
- [ ] **Check template content**
  - Query `message_templates` table
  - Verify EN + 中文 versions exist
- [ ] **Add missing translations**
  - Create templates if missing:
    - New mail arrival (Letter) - EN/中文
    - New mail arrival (Package) - EN/中文
    - 1-week reminder - EN/中文
    - Final notice - EN/中文
    - Contract send-out - EN/中文

**Files to check:**
- Database: `message_templates` table
- May need: `/scripts/seed_default_templates.sql`

---

### Task 4.2: Verify UI/UX Compliance
- [ ] **Check color palette**
  - Verify primary blue (#3B82F6)
  - Verify success green (#10B981)
  - File: `/styles/main.css` or Tailwind config
- [ ] **Check typography**
  - Verify Inter font is used
  - File: Check `<html>` or CSS
- [ ] **Check button sizes**
  - Verify 44x44px minimum touch targets
  - File: `/components/ui/Button/Button.tsx`

**Files to audit:**
- `/styles/main.css`
- `/tailwind.config.js`
- `/app/layout.tsx`

---

## Phase 5: Documentation Updates (Priority 🟢 LOW)

**Estimated Time:** 1-2 hours

### Task 5.1: Update Documentation
- [ ] **Update README.md**
  - Add setup instructions
  - Add testing commands
  - Add deployment guide
- [ ] **Update SETUP_ENV.md**
  - Add RLS setup instructions
  - Add security configuration
- [ ] **Create TESTING.md**
  - Document how to run tests
  - Document test coverage goals

**Files to update:**
- `/README.md`
- `/docs/SETUP_ENV.md`
- Create: `/docs/TESTING.md`

---

## Success Criteria

### Must Have (Phase 1-2):
- ✅ RLS enabled on all tables with proper policies
- ✅ Rate limiting on authentication (documented)
- ✅ `notified_at` timestamp added and functional
- ✅ Status enum expanded to match PRD

### Should Have (Phase 3):
- ✅ Jest configured and running
- ✅ ≥50% test coverage on critical paths
- ✅ Basic E2E tests for main user flows

### Nice to Have (Phase 4-5):
- ✅ All bilingual templates verified/created
- ✅ UI/UX audit completed
- ✅ Documentation updated

---

## Quick Start Commands

```bash
# 1. Security - Check RLS status in Supabase Dashboard
# Go to Database > Tables > Select table > RLS tab

# 2. Database updates
psql $DATABASE_URL < scripts/add_notified_at_column.sql
psql $DATABASE_URL < scripts/expand_status_enum.sql

# 3. Install testing
npm install -D jest @testing-library/react @testing-library/jest-dom

# 4. Run tests
npm test

# 5. Check coverage
npm run test:coverage
```

---

## Timeline Estimate

| Phase | Priority | Time | Can Start |
|-------|----------|------|-----------|
| Phase 1: Security | 🔴 HIGH | 4-5 hrs | Immediately |
| Phase 2: Database | 🟡 MEDIUM | 2-3 hrs | After Phase 1 |
| Phase 3: Testing | 🟡 MEDIUM | 5-6 hrs | Parallel with Phase 2 |
| Phase 4: Features | 🟢 LOW | 3-4 hrs | After Phase 2 |
| Phase 5: Docs | 🟢 LOW | 1-2 hrs | Anytime |

**Total:** 15-20 hours over 1-2 weeks

---

## Notes

- **File structure:** Keep current structure - it's better than plan.md!
- **Architecture:** Keep Next.js full-stack - no need for separate backend
- **Database:** Keep current schema - it's excellent
- **Focus:** Prioritize security (Phase 1) before anything else

---

## Next Steps

1. Start with **Phase 1, Task 1.1** (RLS verification)
2. Work through tasks sequentially
3. Mark off checklist items as completed
4. Update `log.md` with any issues encountered

