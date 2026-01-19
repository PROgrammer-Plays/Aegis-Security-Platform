# 🔐 RBAC System - Complete Implementation Guide

## 🎯 System Overview

### Role Hierarchy

```
┌─────────────────────────────────────────┐
│             SUPERUSER (Admin)            │
│  • God mode - full system access        │
│  • User management                       │
│  • High-level overview (not detailed)   │
│  • Can create/delete accounts           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          SENIOR ANALYST                  │
│  • Operational command                   │
│  • Full dashboard + detailed stats       │
│  • War Room access                       │
│  • Can resolve incidents                 │
│  • Cannot manage users                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           EMPLOYEE/INTERN                │
│  • Restricted view                       │
│  • Only sees own IP alerts               │
│  • Cannot resolve (only request review)  │
│  • "My Security Status" view only        │
└─────────────────────────────────────────┘
```

---

## 📊 View Differences by Role

### Admin View
```
Dashboard:
├── Executive KPIs (High-level only)
│   ├── Critical Threats Count
│   ├── Active Incidents
│   ├── System Health %
│   └── Total Alerts
├── Severity Distribution (Pie Chart)
├── Engine Coverage (Bar Chart)
├── User Management Overview
│   ├── Total Users
│   ├── By Role
│   └── Recent Activity
└── Security Posture Summary

NO ACCESS TO:
❌ Detailed hourly trends
❌ Individual alert details
❌ Live feed
❌ War Room (delegates to seniors)
```

### Senior Analyst View
```
Dashboard:
├── Detailed KPIs
├── All Charts (Pie, Bar, Line, Hourly)
├── Top Targeted Entities
├── Engine Performance
├── Recent Critical Alerts
└── Correlation Incidents

FULL ACCESS TO:
✅ Live Feed (all alerts)
✅ War Room (all incidents)
✅ Forensics (all data)
✅ Can resolve/investigate incidents
```

### Employee View
```
My Security Status:
├── Security Score (based on resolved vs pending)
├── Critical Alerts Count (for their IP only)
├── High Priority Count
├── Pending Review Count
├── Resolved Count
├── Alert List (filtered by assigned_ip)
│   ├── Can view details
│   ├── Can request review
│   └── Cannot resolve
└── Help Instructions

ONLY SEES:
✅ Alerts for their assigned IP
❌ Cannot see other users' alerts
❌ Cannot see global stats
❌ Cannot access War Room
```

---

## 🚀 Implementation Steps

### Step 1: Update Backend Models

**1.1 Update User Model**

Replace `models/User.js`:

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'senior', 'employee'], 
        default: 'employee'
    },
    assigned_ip: { 
        type: String, 
        default: null 
    }, 
    assigned_host: { 
        type: String, 
        default: null 
    },
    fullName: String,
    email: String,
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    createdBy: String
}, { timestamps: true });

// Methods here...
```

**1.2 Update Alert Model**

Add to `models/Alert.js` status enum:

```javascript
status: {
    type: String,
    enum: ['New', 'Investigating', 'Resolved', 'False Positive', 'Review Requested'],
    default: 'New'
}
```

### Step 2: Add RBAC Routes to Backend

**2.1 Add Authentication Middleware**

In `server.js`, add:

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Authenticate middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Admin verification
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admins only' });
    }
    next();
};
```

**2.2 Enhanced Login Route**

```javascript
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        await user.updateLastLogin();
        
        const token = jwt.sign(
            { 
                id: user._id,
                username: user.username,
                role: user.role,
                assigned_ip: user.assigned_ip
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                assigned_ip: user.assigned_ip
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
```

**2.3 RBAC-Filtered Alerts Route**

```javascript
app.get('/api/alerts', authenticate, async (req, res) => {
    try {
        let query = {};
        
        // RBAC FILTERING
        if (req.user.role === 'employee') {
            // Employees only see their IP
            if (!req.user.assigned_ip) {
                return res.json({ alerts: [], total: 0 });
            }
            query.$or = [
                { 'details.ip_address': req.user.assigned_ip },
                { 'details.source_ip': req.user.assigned_ip },
                { 'details.destination_ip': req.user.assigned_ip }
            ];
        }
        // Admins and Seniors see everything
        
        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(100);
        
        res.json({ alerts, total: alerts.length });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
```

**2.4 Admin User Management Routes**

```javascript
// Get all users (admin only)
app.get('/api/admin/users', authenticate, verifyAdmin, async (req, res) => {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ users, total: users.length });
});

// Create user (admin only)
app.post('/api/admin/users', authenticate, verifyAdmin, async (req, res) => {
    const { username, password, role, fullName, email, assigned_ip } = req.body;
    
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
        return res.status(400).json({ error: 'Username exists' });
    }
    
    const user = new User({
        username: username.toLowerCase(),
        password, // Hashed by pre-save hook
        role,
        fullName,
        email,
        assigned_ip,
        createdBy: req.user.username
    });
    
    await user.save();
    res.json({ message: 'User created', user });
});

// Update user (admin only)
app.patch('/api/admin/users/:id', authenticate, verifyAdmin, async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, select: '-password' }
    );
    res.json({ user });
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', authenticate, verifyAdmin, async (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
});
```

**2.5 Create Default Admin**

In `server.js`, after MongoDB connection:

```javascript
mongoose.connect(process.env.ATLAS_URI)
    .then(async () => {
        console.log('✅ MongoDB connected');
        
        // Create default admin
        await User.createDefaultAdmin();
    })
    .catch(err => console.error('❌ MongoDB error:', err));
```

### Step 3: Frontend Implementation

**3.1 Update Login to Store Role**

In `Login.js`:

```javascript
const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.user.role);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('assigned_ip', data.user.assigned_ip || '');
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/admin-dashboard';
            } else if (data.user.role === 'senior') {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/my-status';
            }
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Login failed');
    }
};
```

**3.2 Role-Based Navigation**

In `App.js`:

```javascript
function App() {
    const [role, setRole] = useState(localStorage.getItem('role'));
    const token = localStorage.getItem('token');
    
    if (!token) {
        return <Login />;
    }
    
    return (
        <Router>
            <div className="app">
                <Sidebar role={role} />
                <div className="main-content">
                    <Routes>
                        {/* Admin Routes */}
                        {role === 'admin' && (
                            <>
                                <Route path="/" element={<AdminDashboard />} />
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                                <Route path="/users" element={<UserManagement />} />
                            </>
                        )}
                        
                        {/* Senior Routes */}
                        {role === 'senior' && (
                            <>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/feed" element={<LiveFeed />} />
                                <Route path="/incidents" element={<Incidents />} />
                                <Route path="/forensics" element={<Forensics />} />
                            </>
                        )}
                        
                        {/* Employee Routes */}
                        {role === 'employee' && (
                            <>
                                <Route path="/" element={<MySecurityStatus />} />
                                <Route path="/my-status" element={<MySecurityStatus />} />
                            </>
                        )}
                    </Routes>
                </div>
            </div>
        </Router>
    );
}
```

**3.3 Role-Based Sidebar**

In `Sidebar.js`:

```javascript
const Sidebar = ({ role }) => {
    return (
        <nav className="sidebar">
            <div className="sidebar-header">
                <h2>AEGIS</h2>
                <span className="role-badge">{role}</span>
            </div>
            
            {/* Admin Links */}
            {role === 'admin' && (
                <>
                    <Link to="/admin-dashboard">📊 Executive Dashboard</Link>
                    <Link to="/users">👥 Manage Users</Link>
                </>
            )}
            
            {/* Senior Links */}
            {role === 'senior' && (
                <>
                    <Link to="/dashboard">📊 Dashboard</Link>
                    <Link to="/feed">📡 Live Feed</Link>
                    <Link to="/incidents">🚨 War Room</Link>
                    <Link to="/forensics">🔍 Forensics</Link>
                </>
            )}
            
            {/* Employee Links */}
            {role === 'employee' && (
                <>
                    <Link to="/my-status">🛡️ My Security Status</Link>
                </>
            )}
            
            <button onClick={() => {
                localStorage.clear();
                window.location.reload();
            }}>
                🚪 Logout
            </button>
        </nav>
    );
};
```

---

## 🧪 Testing Workflow

### Test 1: Create Users

```bash
# 1. Start backend
node server.js

# Should see:
👑 Default Superuser created: admin/admin

# 2. Login as admin
Username: admin
Password: admin

# 3. Navigate to "Manage Users"

# 4. Create users:
Senior Analyst:
- Username: mike_senior
- Password: password123
- Role: senior
- Full Name: Mike Johnson

Employee:
- Username: john_intern
- Password: password123
- Role: employee
- Full Name: John Doe
- Assigned IP: 192.168.1.100
```

### Test 2: Generate Alerts

```bash
cd detector
python detector.py simulation

# Should generate alerts for 192.168.1.100
```

### Test 3: Test Employee View

```bash
# Login as: john_intern / password123

Expected:
✅ Sees "My Security Status" page
✅ Only sees alerts for 192.168.1.100
✅ Can request review
❌ Cannot resolve
❌ Cannot access War Room
❌ Cannot see global stats
```

### Test 4: Test Senior View

```bash
# Login as: mike_senior / password123

Expected:
✅ Sees full Dashboard with detailed charts
✅ Can access Live Feed (all alerts)
✅ Can access War Room
✅ Can resolve incidents
✅ Sees review requests from john_intern
❌ Cannot manage users
```

### Test 5: Test Admin View

```bash
# Login as: admin / admin

Expected:
✅ Sees Executive Dashboard (high-level)
✅ Can manage users
✅ Sees user management overview
❌ Does not see detailed charts
❌ Does not access War Room (delegates to seniors)
```

---

## 📊 Data Flow

```
Employee Request:
john_intern clicks "Request Review"
    ↓
Status: New → Review Requested
    ↓
WebSocket broadcast
    ↓
Senior's War Room updates
    ↓
mike_senior sees "Review Requested" badge
    ↓
mike_senior clicks "Investigate"
    ↓
Status: Review Requested → Investigating
    ↓
mike_senior clicks "Resolve"
    ↓
Status: Investigating → Resolved
    ↓
john_intern's view updates (shows ✅ Resolved)
```

---

## ✅ Success Checklist

Backend:
- [ ] User model has role, assigned_ip fields
- [ ] Default admin created (admin/admin)
- [ ] JWT includes role and assigned_ip
- [ ] Alerts API filters by role
- [ ] Stats API filters by role
- [ ] Admin routes protected by verifyAdmin
- [ ] Status enum includes "Review Requested"

Frontend:
- [ ] Login stores role in localStorage
- [ ] Navigation shows role-appropriate links
- [ ] AdminDashboard shows high-level overview
- [ ] Dashboard (senior) shows detailed stats
- [ ] MySecurityStatus shows only user's alerts
- [ ] Employee can request review
- [ ] Senior can resolve
- [ ] Admin can manage users

---

## 🎉 Complete RBAC System

You now have:

✅ Three-tier role hierarchy
✅ Role-specific dashboards
✅ RBAC-filtered data access
✅ User management system
✅ Request review workflow
✅ Executive overview for admins
✅ Operational details for seniors
✅ Restricted view for employees

**Security is enforced at API level - frontend restrictions are just UI!** 🔒
