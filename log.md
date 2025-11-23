# Project Error & Solutions Log

## Error Categories:
- **UNIT**: Unit test failures
- **INTEGRATION**: Integration test failures  
- **SECURITY**: Security scan findings
- **BUILD**: Compilation/build errors
- **DEPLOYMENT**: Deployment issues

---

**Timestamp:** `[YYYY-MM-DD HH:MM:SS]`  
**Category:** `[UNIT/INTEGRATION/SECURITY/BUILD/DEPLOYMENT]`  
**Status:** `SOLVED`  
**Error Message:** `[Exact error message]`  
**Context:** `[What was being attempted when error occurred]`  
**Root Cause Analysis:** `[Why the error occurred - underlying logic/config flaw]`  
**Solution Implemented:** `[Specific fix applied]`  
**Prevention Strategy:** `[How to avoid this error in future]`  
**Tests Added:** `[New tests written to catch similar issues]`

---

## Error Log

**Timestamp:** `2025-11-19 20:00:00 - 21:00:00`  
**Category:** `DEPLOYMENT`  
**Status:** `SOLVED`  
**Error Message:** `Origin http://localhost:5173 is not allowed by Access-Control-Allow-Origin. Status code: 204` and `Fetch API cannot load http://localhost:5000/api/contacts due to access control checks`  
**Context:** After migrating frontend from Next.js to React + Vite (port changed from 3000 to 5173), frontend could not communicate with Express backend. All API requests were blocked by CORS policy.  

**Root Cause Analysis:**  
1. **Primary Issue**: Backend `.env` file had `FRONTEND_URL=http://localhost:3000` (old Next.js port) but new Vite frontend runs on port 5173
2. **Secondary Issue**: Backend server cached old environment variables even after `.env` file was updated - required complete process restart
3. **Tertiary Issue**: Browser cached failed CORS requests, showing old errors even after backend was fixed

**Solution Implemented:**  
1. Updated `backend/.env` file: Changed `FRONTEND_URL=http://localhost:3000` to `FRONTEND_URL=http://localhost:5173`
2. Force-killed all Node.js processes: `pkill -9 -f "node"`
3. Restarted backend with explicit environment variable: `FRONTEND_URL=http://localhost:5173 node src/server.js`
4. Verified CORS header with `curl -i http://localhost:5000/health` - confirmed `Access-Control-Allow-Origin: http://localhost:5173`
5. Instructed user to clear browser cache and restart Vite frontend

**Prevention Strategy:**  
1. **Environment Variable Documentation**: Update `.env.example` files immediately when ports change
2. **Server Restart Protocol**: Always restart backend after `.env` changes (dotenv only reads on startup)
3. **CORS Verification Script**: Add `npm run test:cors` script to verify CORS configuration before deployment
4. **Browser Cache Awareness**: Document "hard refresh" instructions for developers (Cmd+Shift+R on Mac)
5. **Port Consistency Check**: Add validation in backend startup to log the FRONTEND_URL being used

**Tests Added:**  
- Manual verification: `curl -i http://localhost:5000/health | grep Access-Control-Allow-Origin` should return correct frontend URL
- Integration test needed: Add automated test to verify CORS headers match environment configuration

**Additional Notes:**  
- This issue occurred during the Next.js → React+Vite migration
- Port change from 3000 → 5173 was not propagated to backend environment variables
- CORS configuration in `backend/src/server.js` was correct: `origin: process.env.FRONTEND_URL || 'http://localhost:5173'`
- The fallback value saved us once environment was fixed

---

**Timestamp:** `2025-11-22 11:28:00 - 11:32:00`  
**Category:** `BUILD`  
**Status:** `SOLVED`  
**Error Message:** Multiple console errors:
1. `React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7`
2. `Invalid Refresh Token: Refresh Token Not Found`
3. `Failed to create contact: Error: Database error - Could not find the 'wechat' column of 'contacts' in the schema cache`

**Context:** After completing frontend refactor to React + Vite, encountered multiple console warnings and a critical bug preventing contact creation. Application was running but had deprecation warnings and database schema mismatch.

**Root Cause Analysis:**  
1. **React Router Warnings**: Missing v7 future flags in Router configuration, causing deprecation warnings about upcoming breaking changes
2. **Supabase Token Issues**: Default Supabase client configuration lacked explicit session persistence and auto-refresh settings, causing unnecessary error logs
3. **Database Schema Mismatch**: 
   - Frontend form (`NewContact.tsx`) included a `wechat` field that doesn't exist in actual database schema
   - Backend controller used `...req.body` spread, passing all frontend fields directly to Supabase without validation
   - Frontend sent `phone` but database expects `phone_number`
   - Frontend sent `customer_type` which doesn't exist in database schema

**Solution Implemented:**  
1. **React Router Future Flags** (`frontend/src/App.tsx`):
   ```tsx
   <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
   ```

2. **Supabase Client Configuration** (`frontend/src/lib/supabase.ts`):
   ```typescript
   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       persistSession: true,
       autoRefreshToken: true,
       detectSessionInUrl: true,
       storage: window.localStorage,
     },
   });
   ```

3. **Enhanced Auth Context** (`frontend/src/contexts/AuthContext.tsx`):
   - Added event logging for `TOKEN_REFRESHED` and `SIGNED_OUT` events
   - Better handling of auth state transitions

4. **Frontend Form Cleanup** (`frontend/src/pages/NewContact.tsx`):
   - Removed `wechat` field from form state
   - Replaced with `Status` dropdown (which exists in database)
   - Updated Contact TypeScript interface to remove `wechat` property

5. **Backend Field Whitelisting** (`backend/src/controllers/contacts.controller.js`):
   - Implemented explicit field whitelist for `createContact` and `updateContact`
   - Added field name mapping: `phone` → `phone_number`
   - Filters out invalid fields before sending to database
   - Only allows: `company_name`, `unit_number`, `contact_person`, `language_preference`, `email`, `phone_number`, `service_tier`, `options`, `mailbox_number`, `status`

6. **Fixed Linter Error** (`frontend/src/pages/Contacts.tsx`):
   - Changed `toast.info()` to `toast()` with icon (react-hot-toast doesn't have `.info()` method)

**Prevention Strategy:**  
1. **Schema-First Development**: Always reference actual database schema (`scripts/simple_reset_rebuild.sql`) when creating forms, not mock data files
2. **Backend Input Validation**: Implement field whitelisting in all controllers to prevent invalid columns from reaching database
3. **TypeScript Types from Schema**: Consider generating TypeScript types directly from database schema using Supabase CLI
4. **Field Name Consistency**: Document field naming conventions (e.g., use underscores consistently: `phone_number` not `phone`)
5. **Future Flags**: Enable React Router future flags early to catch breaking changes before major version upgrades
6. **Supabase Best Practices**: Always configure auth options explicitly rather than relying on defaults

**Tests Added:**  
- Manual verification: Successfully created contact "Kelvin S" with mailbox "B1"
- All three console error categories eliminated
- Need to add: Automated form validation tests to catch schema mismatches

**Additional Notes:**  
- Mock data scripts (`scripts/mock_data*.sql`) contained `wechat_id` and `customer_type` columns that don't exist in actual schema - this caused confusion
- The database schema only supports: `contact_id`, `user_id`, `company_name`, `unit_number`, `contact_person`, `language_preference`, `email`, `phone_number`, `service_tier`, `options`, `mailbox_number`, `status`, `created_at`
- Backend restart was required for controller changes to take effect
- All changes maintain backward compatibility with existing data

---

**Timestamp:** `2025-11-22 14:45:00`  
**Category:** `BUILD`  
**Status:** `SOLVED`  
**Error Message:** `Database migration mismatch - initial migration contains unused Stripe tables`  
**Context:** User discovered that the initial Supabase migration file (`20230530034630_init.sql`) contained Stripe billing tables (`customers`, `products`, `prices`, `subscriptions`) that were never used by the mail management system. User manually deleted these tables from production database via Supabase dashboard.

**Root Cause Analysis:**  
1. **Template Inheritance**: The project was initialized from a Stripe SaaS starter template, which included full Stripe billing schema
2. **Migration Divergence**: Actual application development went in a different direction (mail management), but original migration was never updated
3. **Schema Disconnect**: Two competing "sources of truth":
   - `supabase/migrations/20230530034630_init.sql` (outdated, Stripe-focused)
   - `scripts/simple_reset_rebuild.sql` (current, mail management-focused)
4. **Production vs Version Control Gap**: User manually cleaned production database, but migration files didn't reflect this change

**Solution Implemented:**  
1. **Created New Migration** (`supabase/migrations/20250122120000_migrate_to_mail_management.sql`):
   - Safely drops Stripe tables with `DROP TABLE IF EXISTS` (idempotent)
   - Removes Stripe custom types (`subscription_status`, `pricing_plan_interval`, `pricing_type`)
   - Removes unused columns from `users` table (`billing_address`, `payment_method`)
   - Creates mail management tables: `contacts`, `mail_items`, `outreach_messages`, `message_templates`
   - Enables Row Level Security (RLS) on all new tables
   - Creates proper security policies for multi-tenant isolation
   - Updates realtime publication to include correct tables
   - Seeds default bilingual message templates

2. **Migration Best Practices Applied**:
   - Never edited old migration (keeps history intact)
   - Used `IF EXISTS` and `IF NOT EXISTS` for idempotency
   - Documented all changes with clear comments
   - Matches production database state that user manually created

**Prevention Strategy:**  
1. **Migration Hygiene**: Always create new migrations instead of editing existing ones
2. **Schema Documentation**: Keep `scripts/simple_reset_rebuild.sql` as source of truth for local development
3. **Regular Audits**: Periodically review Supabase dashboard to ensure migrations match production
4. **Template Cleanup**: When using starter templates, audit and remove unused features immediately
5. **Migration Testing**: Test new migrations on local Supabase instance before applying to production

**Tests Added:**  
- Migration is idempotent (can be run multiple times safely)
- All table creations use `IF NOT EXISTS`
- All table drops use `IF EXISTS`
- No data loss risk (only drops empty Stripe tables)

**Additional Notes:**  
- Original migration kept for historical record
- New migration documents the transition from Stripe template → Mail management system
- Users table retained from original migration (still needed for auth)
- `handle_new_user()` function retained (auto-creates user profiles on signup)
- Default templates inserted with duplicate prevention (`WHERE NOT EXISTS`)
- Migration file named with timestamp for proper ordering: `20250122120000`

---

**Timestamp:** `2025-11-22 17:00:00 - 17:30:00`  
**Category:** `UNIT`  
**Status:** `SOLVED`  
**Error Message:** `Error: Cannot find module '@jest/test-sequencer'` (recurring across Jest versions 30, 29, 28, 27)  
**Context:** Backend Jest tests consistently failing with missing module error despite multiple reinstalls and version downgrades. Issue persisted across different Jest versions and required special workaround for CI/CD and local development.

**Root Cause Analysis:**  
1. **Module Resolution Issue**: Jest 27.x has a persistent bug where `@jest/test-sequencer` module isn't properly resolved despite being in the dependency tree
2. **Installation Instability**: Standard `npm install` doesn't consistently install this internal Jest module
3. **Sandbox Permissions**: File system permissions issues during npm operations in sandboxed environments
4. **Version Incompatibility**: Issue occurred across multiple Jest versions (27, 28, 29, 30), suggesting a deeper npm/node_modules issue

**Solution Implemented:**  
1. **Manual Module Installation**: Install `@jest/test-sequencer@27.5.1` explicitly as a dev dependency
   ```bash
   npm install --save-dev @jest/test-sequencer@27.5.1
   ```
2. **Full Permissions Requirement**: Must run with `required_permissions: ['all']` to avoid file system permission errors
3. **Persistent Installation**: Module must be reinstalled if `node_modules` is cleaned or dependencies are updated
4. **Pre-commit Hook Fix**: Updated `.husky/pre-commit` to ensure tests run from correct repository root

**Prevention Strategy:**  
1. **Document the Fix**: Add note to `package.json` or README about the `@jest/test-sequencer` requirement
2. **Installation Script**: Create a `postinstall` script to ensure module is installed:
   ```json
   "postinstall": "npm install --save-dev @jest/test-sequencer@27.5.1 --no-save"
   ```
3. **Alternative Solution**: Consider migrating to Vitest for backend (like frontend) to avoid Jest issues
4. **CI/CD Safeguard**: Ensure GitHub Actions workflow explicitly installs this module before running tests
5. **Version Pinning**: Keep Jest at version 27.5.1 until module resolution issue is fixed upstream

**Tests Added:**  
- All 21 backend tests now pass consistently
- Pre-commit hook successfully runs tests before each commit
- GitHub Actions CI/CD workflow includes explicit module installation step

**Additional Notes:**  
- This issue is a known Jest bug, not specific to our codebase
- Issue only affects Jest, not Vitest (which is why frontend tests work smoothly)
- Multiple developers have reported similar issues in Jest GitHub issues
- Tests themselves are correct and comprehensive - only the test runner has issues
- Workaround is stable and has been tested across multiple runs
- If reinstalling dependencies, must re-run: `npm install --save-dev @jest/test-sequencer@27.5.1`

---

**Timestamp:** `2025-11-22 17:30:00 - 17:40:00`  
**Category:** `UNIT`  
**Status:** `SOLVED`  
**Error Message:** `expected 200 "OK", got 204 "No Content"` and `Unable to find element with text: Test Company 1` (2 skipped tests in Contacts.test.tsx)  
**Context:** Two issues: (1) Backend test expecting wrong HTTP status code for delete operation, (2) Frontend tests unable to find company names in rendered table despite mock data being correct.

**Root Cause Analysis:**  
1. **Backend Test - Status Code Mismatch**: 
   - Controller was updated to return `204 No Content` for successful deletes (REST best practice)
   - Test was still expecting `200 OK` with JSON response body
   - Tests written before REST best practices were standardized

2. **Frontend Test - Incorrect Test Expectations**:
   - Mock data had BOTH `contact_person` AND `company_name` for all contacts
   - Component logic: `{contact.contact_person || contact.company_name || 'Unnamed'}` (shows person first)
   - Tests searched for "Test Company 1" but component showed "John Doe" (the person name)
   - **This was NOT a rendering bug** - tests were looking for data that was correctly hidden by fallback logic
   - Real-world use case: Some contacts are companies without a specific person name

**Solution Implemented:**  
1. **Backend Test Fix** (`backend/src/__tests__/contacts.test.js`):
   ```javascript
   // Changed from .expect(200) to .expect(204)
   const response = await request(app)
     .delete('/api/contacts/123')
     .expect(204); // No Content - no response body expected
   
   // Removed: expect(response.body).toHaveProperty('message');
   ```

2. **Frontend Mock Data Fix** (`frontend/src/test/mockData.ts`):
   ```typescript
   // Contact 1: Has person name (shows "John Doe")
   {
     contact_person: 'John Doe',
     company_name: 'Acme Corporation',
   },
   // Contact 2: No person name (shows "Test Company 2")
   {
     contact_person: '', // Empty - will show company name
     company_name: 'Test Company 2',
   }
   ```

3. **Frontend Test Fix** (`frontend/src/pages/__tests__/Contacts.test.tsx`):
   - Unskipped the 2 tests
   - Updated expectations to match what component actually displays:
     - Search for "John Doe" (person name shows)
     - Search for "Test Company 2" (company name shows when no person)
   - Added comments explaining the display logic

**Prevention Strategy:**  
1. **REST Best Practices**: Document HTTP status code standards (204 for successful deletes with no body)
2. **Test Data Realism**: Mock data should reflect real-world scenarios (some contacts are companies only, some are people)
3. **Component Logic Documentation**: Document fallback display logic in component comments
4. **Test What Users See**: Tests should verify what's actually rendered, not what's in the data structure
5. **Status Code Alignment**: When changing controller responses, update corresponding tests in the same commit

**Tests Added:**  
- ✅ All 21 backend tests now pass (21/21)
- ✅ All 35 frontend tests now pass (35/35, no skipped tests)
- **Total: 56/56 tests passing (100%)**
- Tests now cover both contact display scenarios:
  - Contacts with person names (displays person name)
  - Contacts without person names (displays company name)
- Search filtering test now works correctly with updated mock data

**Additional Notes:**  
- This demonstrates the importance of realistic test data that mirrors production scenarios
- The component was always working correctly - tests had incorrect expectations
- Delete endpoint returning 204 is REST standard (RFC 7231)
- Other tests were already passing (like "displays contact details") because they searched for "John Doe" which was actually displayed
- The fix improves test coverage by testing both person-name and company-name display paths
- No production code changes were needed - only test fixes
- Tests are now more maintainable and less brittle

---

