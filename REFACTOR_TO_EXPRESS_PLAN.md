# Refactoring Plan: Separate Frontend & Backend

**Goal:** Restructure current Next.js full-stack app into separate Express backend + Next.js frontend  
**Timeline:** 3-5 days  
**Cost:** $0/month (using Vercel for both)  
**Reason:** Better maintainability, clearer separation, coach recommendation

---

## Phase 1: Create Backend Structure (Day 1)

### Step 1.1: Create Backend Directory

```bash
cd /Users/butterchen/Desktop/mail-management-system
mkdir backend
cd backend
npm init -y
```

### Step 1.2: Install Backend Dependencies

```bash
npm install express cors dotenv helmet express-rate-limit
npm install @supabase/supabase-js
npm install --save-dev nodemon
```

### Step 1.3: Create Backend File Structure

```bash
mkdir -p src/{routes,controllers,services,middleware,utils}
touch src/server.js
touch src/routes/{auth.routes.js,contacts.routes.js,mailItems.routes.js,messages.routes.js,templates.routes.js,index.js}
touch src/controllers/{contacts.controller.js,mailItems.controller.js}
touch src/services/{supabase.service.js,auth.service.js}
touch src/middleware/{auth.middleware.js,errorHandler.js}
touch .env.example .env
```

### Step 1.4: Set Up Express Server

**File: `backend/src/server.js`**

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = app;
```

### Step 1.5: Set Up Environment Variables

**File: `backend/.env.example`**

```bash
PORT=5000
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Node Environment
NODE_ENV=development
```

### Step 1.6: Update Package.json Scripts

**File: `backend/package.json`**

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest"
  }
}
```

---

## Phase 2: Migrate API Logic (Day 2-3)

### Step 2.1: Set Up Supabase Service

**File: `backend/src/services/supabase.service.js`**

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for server-side operations
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = {
  supabase,
  supabaseAdmin
};
```

### Step 2.2: Create Auth Middleware

**File: `backend/src/middleware/auth.middleware.js`**

```javascript
const { supabase } = require('../services/supabase.service');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authenticateUser;
```

### Step 2.3: Migrate Contacts Routes

**File: `backend/src/routes/contacts.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contacts.controller');
const authenticateUser = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

// GET /api/contacts - List all contacts
router.get('/', contactsController.getContacts);

// POST /api/contacts - Create new contact
router.post('/', contactsController.createContact);

// GET /api/contacts/:id - Get single contact
router.get('/:id', contactsController.getContactById);

// PUT /api/contacts/:id - Update contact
router.put('/:id', contactsController.updateContact);

// DELETE /api/contacts/:id - Delete contact (soft delete)
router.delete('/:id', contactsController.deleteContact);

module.exports = router;
```

**File: `backend/src/controllers/contacts.controller.js`**

```javascript
const { supabase } = require('../services/supabase.service');

exports.getContacts = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.createContact = async (req, res, next) => {
  try {
    const contactData = {
      ...req.body,
      user_id: req.user.id
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contact not found' });
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('contacts')
      .update(req.body)
      .eq('contact_id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting status to 'No'
    const { data, error } = await supabase
      .from('contacts')
      .update({ status: 'No' })
      .eq('contact_id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Contact deleted successfully', data });
  } catch (error) {
    next(error);
  }
};
```

### Step 2.4: Create Route Index

**File: `backend/src/routes/index.js`**

```javascript
const express = require('express');
const router = express.Router();

const contactsRoutes = require('./contacts.routes');
const mailItemsRoutes = require('./mailItems.routes');
const messagesRoutes = require('./messages.routes');
const templatesRoutes = require('./templates.routes');

router.use('/contacts', contactsRoutes);
router.use('/mail-items', mailItemsRoutes);
router.use('/messages', messagesRoutes);
router.use('/templates', templatesRoutes);

module.exports = router;
```

### Step 2.5: Add Error Handler

**File: `backend/src/middleware/errorHandler.js`**

```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Supabase errors
  if (err.code) {
    return res.status(400).json({
      error: err.message || 'Database error'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
```

---

## Phase 3: Update Frontend (Day 3-4)

### Step 3.1: Create API Service Layer

**File: `frontend/services/api.js`**

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export const api = {
  contacts: {
    getAll: async () => {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.json();
    },
    
    create: async (data) => {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    // ... similar for update, delete, getById
  },
  
  mailItems: {
    // Similar structure
  }
};
```

### Step 3.2: Update Frontend Environment Variables

**File: `frontend/.env.local`**

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3.3: Update Components to Use New API

Replace direct Supabase calls with API service calls:

```javascript
// OLD (current):
const contacts = await getContacts(supabase);

// NEW (after refactor):
const contacts = await api.contacts.getAll();
```

---

## Phase 4: Testing (Day 4)

### Step 4.1: Test Backend Independently

```bash
cd backend
npm run dev

# Test with curl or Postman:
curl http://localhost:5000/health
curl http://localhost:5000/api/contacts -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4.2: Test Frontend with Backend

```bash
# Terminal 1: Run backend
cd backend && npm run dev

# Terminal 2: Run frontend
cd frontend && npm run dev

# Visit http://localhost:3000 and test all features
```

---

## Phase 5: Deployment (Day 5)

### Step 5.1: Deploy Backend to Vercel (FREE)

**File: `backend/vercel.json`**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

```bash
cd backend
vercel --prod
# Follow prompts, add environment variables in Vercel dashboard
```

### Step 5.2: Deploy Frontend to Vercel (FREE)

```bash
cd frontend
vercel --prod
# Update NEXT_PUBLIC_API_URL to production backend URL
```

---

## Migration Checklist

- [ ] **Phase 1:** Backend structure created
- [ ] **Phase 2:** API routes migrated
  - [ ] Contacts CRUD
  - [ ] Mail Items CRUD
  - [ ] Messages CRUD
  - [ ] Templates CRUD
  - [ ] Dashboard stats
- [ ] **Phase 3:** Frontend updated
  - [ ] API service layer created
  - [ ] Components updated to use new API
  - [ ] Auth flow updated
- [ ] **Phase 4:** Testing complete
  - [ ] Backend tests passing
  - [ ] Frontend tests passing
  - [ ] Integration tests passing
- [ ] **Phase 5:** Deployed
  - [ ] Backend deployed to Vercel
  - [ ] Frontend deployed to Vercel
  - [ ] Environment variables configured
  - [ ] Production testing complete

---

## Cost Summary After Refactor

| Service | Cost |
|---------|------|
| Backend (Vercel) | **FREE** ✅ |
| Frontend (Vercel) | **FREE** ✅ |
| Database (Supabase) | **FREE** ✅ |
| **Total** | **$0/month** 🎉 |

---

## Benefits of This Approach

✅ **Maintainability** - Clear separation your coach wants  
✅ **Learning** - Proper Express.js architecture  
✅ **Cost** - Still free using Vercel  
✅ **Flexibility** - Can swap frontend/backend independently  
✅ **Scalability** - Can move to paid hosting later if needed  
✅ **Coach Approval** - Follows traditional full-stack patterns  

---

## Timeline

- **Day 1:** Backend setup & structure
- **Day 2:** Migrate contacts & mail items APIs
- **Day 3:** Migrate remaining APIs, update frontend
- **Day 4:** Testing & bug fixes
- **Day 5:** Deploy to production

**Total:** 3-5 days depending on pace

---

## Next Steps

1. Review this plan with your coach
2. Start with Phase 1 (backend structure)
3. Migrate one route at a time
4. Test incrementally
5. Deploy when stable

