# 🚀 Complete RBAC Integration Guide - Step by Step

## 📦 What You're Getting

This package includes a complete Role-Based Access Control system with:

✅ **Backend:** Enhanced User model, RBAC routes, authentication middleware
✅ **Frontend:** Role-specific dashboards, components, routing
✅ **Styling:** Complete CSS for all new components
✅ **Integration:** Step-by-step implementation guide

---

## 📁 File Structure

```
project-root/
├── models/
│   ├── User.js          ← NEW (Enhanced RBAC user model)
│   └── Alert.js         ← UPDATE (Add 'Review Requested' to status enum)
├── server.js            ← UPDATE (Add RBAC routes)
├── frontend/
│   ├── src/
│   │   ├── App.js       ← REPLACE (With App_RBAC.js)
│   │   ├── App.css      ← UPDATE (May need minor updates)
│   │   ├── components/
│   │   │   ├── Sidebar.js     ← REPLACE
│   │   │   └── Sidebar.css    ← NEW
│   │   └── pages/
│   │       ├── Login.js       ← REPLACE (With Login_RBAC.js)
│   │       ├── Login.css      ← NEW
│   │       ├── AdminDashboard.js    ← NEW
│   │       ├── AdminDashboard.css   ← NEW
│   │       ├── MySecurityStatus.js  ← NEW
│   │       ├── MySecurityStatus.css ← NEW
│   │       ├── UserManagement.js    ← NEW
│   │       └── UserManagement.css   ← NEW
```

---

## 🔧 Step-by-Step Implementation

### PHASE 1: Backend Setup

#### Step 1.1: Update User Model

**File:** `models/User.js`

Replace your entire User.js with the provided **User.js** file.

**Key features:**
- Role enum: admin, senior, employee
- assigned_ip and assigned_host fields
- Password hashing (bcrypt)
- createDefaultAdmin() static method
- comparePassword() instance method

#### Step 1.2: Update Alert Model

**File:** `models/Alert.js`

Add "Review Requested" to status enum:

```javascript
status: {
    type: String,
    enum: ['New', 'Investigating', 'Resolved', 'False Positive', 'Review Requested'],
    //                                                            ^^^^^^^^^^^^^^^^^ ADD THIS
    default: 'New'
}
```

#### Step 1.3: Add RBAC Routes to Server

**File:** `server.js`

**Option A: Add routes from server_rbac_routes.js**

Copy and paste all routes from `server_rbac_routes.js` into your `server.js`. Place them after your existing routes but before `server.listen()`.

Routes to add:
- `POST /api/auth/login` (enhanced with role)
- `POST /api/auth/register`
- `GET /api/auth/profile`
- `GET /api/alerts` (with RBAC filtering)
- `GET /api/stats` (with RBAC filtering)
- `PATCH /api/alerts/:id/status` (with RBAC)
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

**Option B: Merge files**

If you prefer, extract the routes and middleware from `server_rbac_routes.js` and integrate them into your existing server.js structure.

#### Step 1.4: Create Default Admin

Add this after MongoDB connection in `server.js`:

```javascript
mongoose.connect(process.env.ATLAS_URI)
    .then(async () => {
        console.log('✅ MongoDB connected');
        
        // Create default admin if doesn't exist
        await User.createDefaultAdmin();
    })
    .catch(err => console.error('❌ MongoDB error:', err));
```

#### Step 1.5: Update Environment Variables

**File:** `.env`

Add JWT secret:

```env
ATLAS_URI=mongodb://localhost:27017/aegis_security
BackEnd_PORT=5000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

---

### PHASE 2: Frontend Component Setup

#### Step 2.1: Update App.js

**File:** `frontend/src/App.js`

**Replace with:** `App_RBAC.js`

```bash
cp App_RBAC.js frontend/src/App.js
```

This new App.js includes:
- Authentication check on mount
- Role-based routing
- Separate routes for admin, senior, employee
- Protected routes

#### Step 2.2: Update Sidebar

**File:** `frontend/src/components/Sidebar.js`

**Replace** your existing Sidebar.js with the provided **Sidebar.js**

**File:** `frontend/src/components/Sidebar.css`

**Create new file** with the provided **Sidebar.css**

#### Step 2.3: Update Login

**File:** `frontend/src/pages/Login.js`

**Replace with:** `Login_RBAC.js`

```bash
cp Login_RBAC.js frontend/src/pages/Login.js
```

**File:** `frontend/src/pages/Login.css`

**Create new file** with the provided **Login.css**

#### Step 2.4: Add Admin Dashboard

**Files to create:**
- `frontend/src/pages/AdminDashboard.js`
- `frontend/src/pages/AdminDashboard.css`

Copy from provided files.

#### Step 2.5: Add Employee Dashboard

**Files to create:**
- `frontend/src/pages/MySecurityStatus.js`
- `frontend/src/pages/MySecurityStatus.css`

Copy from provided files.

#### Step 2.6: Add User Management

**Files to create:**
- `frontend/src/pages/UserManagement.js`
- `frontend/src/pages/UserManagement.css`

Copy from provided files.

---

### PHASE 3: CSS Extraction

Extract CSS from `ALL_REMAINING_CSS.txt`:

**AdminDashboard.css:**
- Copy section starting with `=== AdminDashboard.css ===`
- Save to `frontend/src/pages/AdminDashboard.css`

**MySecurityStatus.css:**
- Copy section starting with `=== MySecurityStatus.css ===`
- Save to `frontend/src/pages/MySecurityStatus.css`

**UserManagement.css:**
- Copy section starting with `=== UserManagement.css ===`
- Save to `frontend/src/pages/UserManagement.css`

---

### PHASE 4: Testing & Verification

#### Step 4.1: Start Backend

```bash
# In project root
node server.js

# Expected output:
✅ MongoDB connected
👑 Default Superuser created: admin/admin
```

#### Step 4.2: Start Frontend

```bash
cd frontend
npm start

# Should open: http://localhost:3000
```

#### Step 4.3: Test Admin Login

```
Navigate to: http://localhost:3000
Username: admin
Password: admin

Expected:
✅ Redirects to /admin-dashboard
✅ Shows Executive Dashboard
✅ Can see "Manage Users" link in sidebar
```

#### Step 4.4: Create Users

As admin, click "Manage Users" → "Create User"

**Create Senior Analyst:**
```
Username: mike_senior
Password: password123
Role: senior
Full Name: Mike Johnson
Email: mike@company.com
```

**Create Employee:**
```
Username: john_intern
Password: password123
Role: employee
Full Name: John Doe
Email: john@company.com
Assigned IP: 192.168.1.100
```

#### Step 4.5: Test Senior Login

Logout, then login as:
```
Username: mike_senior
Password: password123

Expected:
✅ Redirects to /dashboard
✅ Shows full detailed dashboard
✅ Can access: Dashboard, Live Feed, War Room, Forensics
✅ Sees all alerts
```

#### Step 4.6: Generate Test Data

```bash
cd detector
python detector.py simulation

# This generates alerts for 192.168.1.100
```

#### Step 4.7: Test Employee Login

Logout, then login as:
```
Username: john_intern
Password: password123

Expected:
✅ Redirects to /my-status
✅ Shows "My Security Status" page
✅ Only sees alerts for 192.168.1.100
✅ Can click "Request Review" button
❌ Cannot resolve alerts
❌ No access to War Room or global views
```

#### Step 4.8: Test Review Workflow

```
1. As john_intern:
   - Click "Request Review" on an alert
   - Status changes to "Review Requested"

2. Logout and login as mike_senior:
   - Go to War Room (/incidents)
   - See alert with "Review Requested" status
   - Click "Investigate" → Status changes
   - Click "Resolve" → Status changes to "Resolved"

3. Logout and login back as john_intern:
   - Alert now shows "✅ Resolved"
```

---

## 🔧 Troubleshooting

### Issue 1: "Invalid token" error

**Solution:**
```bash
# Clear localStorage
localStorage.clear()
# Or in browser console: press F12, go to Application → Local Storage → Clear All
```

### Issue 2: Admin not created

**Solution:**
```bash
# Check if User model is imported in server.js
const User = require('./models/User');

# Check logs - should see:
👑 Default Superuser created: admin/admin
```

### Issue 3: Employee sees all alerts

**Solution:**
- Check backend RBAC filtering in GET /api/alerts route
- Verify JWT token includes assigned_ip
- Check browser console for role value

### Issue 4: CSS not loading

**Solution:**
```bash
# Make sure all CSS files are imported in components:
// In AdminDashboard.js
import './AdminDashboard.css';

// In MySecurityStatus.js
import './MySecurityStatus.css';

// etc.
```

### Issue 5: Routes not working

**Solution:**
```bash
# Verify react-router-dom is installed
npm install react-router-dom

# Check App.js imports
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
```

---

## 📊 Data Flow

### Login Flow:
```
User enters credentials
    ↓
POST /api/auth/login
    ↓
Backend validates with User.comparePassword()
    ↓
Generate JWT with role + assigned_ip
    ↓
Frontend stores: token, role, username, assigned_ip
    ↓
Redirect based on role:
- admin → /admin-dashboard
- senior → /dashboard
- employee → /my-status
```

### RBAC Filtering Flow:
```
Frontend requests GET /api/alerts
    ↓
Backend authenticate middleware extracts JWT
    ↓
Check req.user.role:
- employee → Filter by assigned_ip
- senior/admin → Show all
    ↓
Return filtered results
    ↓
Frontend displays appropriately
```

### Review Request Flow:
```
Employee clicks "Request Review"
    ↓
PATCH /api/alerts/:id/status { status: "Review Requested" }
    ↓
Backend checks: req.user.role === 'employee'
    ↓
Allows only: "New" or "Review Requested"
    ↓
Update database
    ↓
WebSocket broadcast to all clients
    ↓
Senior's War Room updates automatically
```

---

## ✅ Final Checklist

### Backend:
- [ ] User.js model with RBAC fields
- [ ] Alert.js has "Review Requested" status
- [ ] All RBAC routes added to server.js
- [ ] Default admin creation in server startup
- [ ] JWT_SECRET in .env
- [ ] Server starts without errors

### Frontend:
- [ ] App.js replaced with RBAC version
- [ ] Sidebar.js and Sidebar.css in place
- [ ] Login.js and Login.css updated
- [ ] AdminDashboard.js and .css created
- [ ] MySecurityStatus.js and .css created
- [ ] UserManagement.js and .css created
- [ ] All CSS files properly imported

### Testing:
- [ ] Can login as admin (admin/admin)
- [ ] Admin sees Executive Dashboard
- [ ] Can create users via User Management
- [ ] Can login as senior analyst
- [ ] Senior sees full detailed dashboard
- [ ] Can login as employee
- [ ] Employee sees only their IP alerts
- [ ] Employee can request review
- [ ] Senior can resolve employee requests
- [ ] RBAC filtering works at API level

---

## 🎉 Success!

You now have a **complete enterprise-grade RBAC system** with:

✅ Three-tier access control (Admin, Senior, Employee)
✅ Role-specific dashboards
✅ API-level security filtering
✅ User management interface
✅ Review request workflow
✅ Professional UI/UX
✅ Secure authentication (JWT + bcrypt)

**Your security monitoring system is now production-ready!** 🚀

---

## 📞 Need Help?

### Common Commands:

```bash
# Start backend
node server.js

# Start frontend
cd frontend && npm start

# Generate test data
cd detector && python detector.py simulation

# Clear all data and restart
# Stop servers, then:
mongo aegis_security --eval "db.dropDatabase()"
# Restart servers
```

### Quick Fixes:

```bash
# Reset localStorage (in browser console)
localStorage.clear()
window.location.reload()

# Recreate admin user
# In server.js, force recreation by deleting first
await User.deleteOne({ username: 'admin' });
await User.createDefaultAdmin();

# Check JWT token
console.log(localStorage.getItem('token'))
console.log(localStorage.getItem('role'))
```

That's it! You're all set! 🎊
