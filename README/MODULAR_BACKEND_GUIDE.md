# 🏗️ Modular Backend Architecture - Complete Setup Guide

## 📁 New Folder Structure

```
project-root/
├── server.js                    ← Main entry (ONLY 100 lines!)
├── package.json
├── .env
├── config/
│   ├── constants.js            ← Environment variables
│   └── database.js             ← MongoDB connection
├── middleware/
│   ├── auth.js                 ← JWT authentication
│   └── rbac.js                 ← Role-based access control
├── routes/
│   ├── auth.routes.js          ← Login, register, profile
│   ├── alerts.routes.js        ← Alert CRUD operations
│   ├── stats.routes.js         ← Dashboard statistics
│   └── admin.routes.js         ← User management
├── services/
│   ├── socket.service.js       ← WebSocket management
│   └── admin.service.js        ← Admin user creation
├── models/
│   ├── Alert.js                ← Alert schema (existing)
│   └── User.js                 ← User schema (existing)
├── utils/
│   └── logger.js               ← Logging utility
└── logs/
    └── aegis.log               ← Auto-created log file
```

---

## 🚀 Installation Steps

### Step 1: Create Folder Structure

```bash
# In your project root
mkdir -p config middleware routes services utils logs

# Verify structure
ls -la
# Should see: config, middleware, routes, services, utils, logs
```

### Step 2: Copy All Files

**Config files:**
```bash
cp config/constants.js config/
cp config/database.js config/
```

**Middleware files:**
```bash
cp middleware/auth.js middleware/
cp middleware/rbac.js middleware/
```

**Routes files:**
```bash
cp routes/auth.routes.js routes/
cp routes/alerts.routes.js routes/
cp routes/stats.routes.js routes/
cp routes/admin.routes.js routes/
```

**Services files:**
```bash
cp services/socket.service.js services/
cp services/admin.service.js services/
```

**Utils files:**
```bash
cp utils/logger.js utils/
```

**Main server file:**
```bash
# Backup old server
mv server.js server.js.backup

# Copy new modular server
cp server_modular.js server.js
```

### Step 3: Verify All Files

```bash
# Check each directory
ls config/
# Should show: constants.js database.js

ls middleware/
# Should show: auth.js rbac.js

ls routes/
# Should show: auth.routes.js alerts.routes.js stats.routes.js admin.routes.js

ls services/
# Should show: socket.service.js admin.service.js

ls utils/
# Should show: logger.js
```

### Step 4: Ensure Models Exist

```bash
ls models/
# Should show: Alert.js User.js

# If User.js is missing, copy it:
cp User.js models/
```

### Step 5: Check Dependencies

```bash
npm install express mongoose cors dotenv jsonwebtoken bcrypt socket.io
```

### Step 6: Verify .env File

```bash
cat .env

# Should contain:
# ATLAS_URI=mongodb://localhost:27017/aegis_security
# BackEnd_PORT=5000
# JWT_SECRET=aegis_super_secret_key_change_in_production
# CORS_ORIGIN=http://localhost:3000
```

---

## ✅ Start the Server

```bash
node server.js
```

**Expected Output:**
```
✅ MongoDB connected successfully
📊 Database: aegis_security
🌐 Host: localhost

═══════════════════════════════════════════
👑 DEFAULT ADMIN CREATED SUCCESSFULLY
═══════════════════════════════════════════
Username: admin
Password: admin
═══════════════════════════════════════════

📡 WebSocket server initialized

═══════════════════════════════════════════
🛡️  AEGIS Security Backend
═══════════════════════════════════════════
🚀 Server running on port: 5000
🌐 API: http://localhost:5000
📡 WebSocket ready
🔒 CORS origin: http://localhost:3000
═══════════════════════════════════════════
```

---

## 📊 Benefits of Modular Architecture

### Before (800+ lines in one file):
❌ Hard to find specific code
❌ Merge conflicts nightmare
❌ Testing is difficult
❌ Can't reuse code easily
❌ Debugging takes forever

### After (100 lines main + modules):
✅ **Easy to navigate** - Each file has ONE purpose
✅ **Easy to debug** - Know exactly where to look
✅ **Easy to test** - Test individual modules
✅ **Easy to scale** - Add new routes without touching existing
✅ **Team-friendly** - Multiple people can work simultaneously
✅ **Maintainable** - Update one module without affecting others

---

## 📝 File Responsibilities

### server.js (100 lines)
**Only does:**
- Load configuration
- Set up middleware
- Register routes
- Start server
- Handle shutdown

**Does NOT contain:**
- Any business logic
- Route handlers
- Database queries
- Authentication logic

### config/constants.js
**Contains:**
- Environment variables
- Port numbers
- JWT secrets
- Default credentials
- CORS settings

### config/database.js
**Contains:**
- MongoDB connection logic
- Connection event handlers
- Graceful shutdown

### middleware/auth.js
**Contains:**
- JWT token verification
- `authenticate()` middleware
- `optionalAuth()` middleware

### middleware/rbac.js
**Contains:**
- Role verification (admin, senior, employee)
- RBAC query filters
- Alert action permissions

### routes/auth.routes.js
**Endpoints:**
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/profile
- PATCH /api/auth/change-password

### routes/alerts.routes.js
**Endpoints:**
- POST /api/alerts (create)
- GET /api/alerts (list with RBAC)
- GET /api/alerts/:id (single)
- PATCH /api/alerts/:id/status (update)
- DELETE /api/alerts/:id (delete)

### routes/stats.routes.js
**Endpoints:**
- GET /api/stats (dashboard stats)
- GET /api/stats/detailed (senior+ only)
- GET /api/stats/timeline (custom range)

### routes/admin.routes.js
**Endpoints:**
- GET /api/admin/users (list)
- POST /api/admin/users (create)
- PATCH /api/admin/users/:id (update)
- DELETE /api/admin/users/:id (delete)
- PATCH /api/admin/users/:id/reset-password
- PATCH /api/admin/users/:id/toggle-status

### services/socket.service.js
**Functions:**
- `initializeSocket()` - Set up WebSocket
- `broadcastNewAlert()` - Send to all clients
- `broadcastAlertUpdate()` - Update notification
- `getIO()` - Get Socket.IO instance

### services/admin.service.js
**Functions:**
- `createDefaultAdmin()` - Auto-create admin
- `resetAdminPassword()` - Reset to default

### utils/logger.js
**Functions:**
- `logger.debug()` - Debug messages
- `logger.info()` - Info messages
- `logger.warn()` - Warnings
- `logger.error()` - Errors
- Writes to logs/aegis.log

---

## 🔧 How to Add New Features

### Example: Add a new route for exporting data

**1. Create route file:**
```bash
touch routes/export.routes.js
```

**2. Write the route:**
```javascript
// routes/export.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Alert = require('../models/Alert');

router.get('/', authenticate, async (req, res) => {
    const alerts = await Alert.find().sort({ timestamp: -1 });
    res.json({ alerts });
});

module.exports = router;
```

**3. Register in server.js:**
```javascript
// server.js
const exportRoutes = require('./routes/export.routes');

// In routes section:
app.use('/api/export', exportRoutes);
```

**Done!** No need to touch any other files!

---

## 🧪 Testing Individual Modules

### Test authentication:
```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### Test stats:
```bash
# Get token first, then:
curl http://localhost:5000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test admin routes:
```bash
curl http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Debugging Guide

### Issue: Can't connect to database
**Check:** `config/database.js`
```bash
# Test connection
mongo aegis_security --eval "db.stats()"
```

### Issue: Authentication failing
**Check:** `middleware/auth.js` and `routes/auth.routes.js`
```bash
# Check JWT secret
echo $JWT_SECRET
```

### Issue: RBAC not filtering correctly
**Check:** `middleware/rbac.js`
```bash
# Check user role in token
# Decode JWT at jwt.io
```

### Issue: Routes not found
**Check:** `server.js` route registration
```bash
# Verify all routes registered
grep "app.use" server.js
```

---

## 📊 File Size Comparison

### Before:
```
server.js: 820 lines ← EVERYTHING
```

### After:
```
server.js: 100 lines              ← Entry point
config/constants.js: 25 lines     ← Configuration
config/database.js: 50 lines      ← DB logic
middleware/auth.js: 50 lines      ← Auth logic
middleware/rbac.js: 150 lines     ← RBAC logic
routes/auth.routes.js: 140 lines  ← Auth routes
routes/alerts.routes.js: 180 lines ← Alert routes
routes/stats.routes.js: 140 lines  ← Stats routes
routes/admin.routes.js: 180 lines  ← Admin routes
services/socket.service.js: 70 lines ← WebSocket
services/admin.service.js: 50 lines  ← Admin service
utils/logger.js: 80 lines          ← Logging
───────────────────────────────────
TOTAL: ~1,200 lines
```

**But now:**
- ✅ Each file has ONE clear purpose
- ✅ Easy to find what you need
- ✅ Can work on features independently
- ✅ Much easier to maintain

---

## ✅ Success Checklist

After setup, verify:

- [ ] All folders created (config, middleware, routes, services, utils)
- [ ] All files copied to correct locations
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] Server starts without errors
- [ ] Admin user created
- [ ] WebSocket initialized
- [ ] Can login via API
- [ ] Routes work (test with curl or Postman)

---

## 🎉 You Now Have

✅ **Clean, modular backend** (from 820 to 100-line main file!)
✅ **Easy to maintain** - Each file has clear purpose
✅ **Easy to debug** - Know exactly where to look
✅ **Easy to scale** - Add features without touching existing code
✅ **Team-friendly** - Multiple developers can work simultaneously
✅ **Production-ready** - Professional architecture

**Your backend is now enterprise-grade!** 🚀
