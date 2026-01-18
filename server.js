// server.js - AEGIS Command Center Backend (Enhanced with Stats)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

// === SETUP ===
const app = express();
const PORT = process.env.BackEnd_PORT || 5000;


// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === DATABASE CONNECTION ===
mongoose.connect(process.env.ATLAS_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB error:", err));


// === HTTP SERVER & SOCKET.IO ===
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});


// === ALERT MODEL ===
const Alert = require('./models/Alert');


// === API ENDPOINTS ===


// POST /api/alerts - Receive new alert from detector
app.post('/api/alerts', async (req, res) => {
    console.log(`\n[${new Date().toISOString()}] New alert received`);
    console.log(`Engine: ${req.body.engine}`);
    console.log(`Type: ${req.body.alertType}`);
    console.log(`Severity: ${req.body.severity}`);
    
    const newAlert = new Alert(req.body);
    
    try {
        const savedAlert = await newAlert.save();
        console.log(`✅ Alert saved to database (ID: ${savedAlert._id})`);
        
        // Broadcast to all connected clients
        io.emit('new-alert', savedAlert);
        console.log(`📡 Broadcasted to ${io.engine.clientsCount} client(s)\n`);
        
        res.status(201).json(savedAlert);
    } catch (error) {
        console.error("❌ Error saving alert:", error);
        res.status(400).json({ message: "Error saving alert", error });
    }
});

// GET /api/stats - ENHANCED Dashboard Statistics
app.get('/api/stats', async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        console.log(`📊 Calculating stats for last ${hours} hours...`);
        
        // 1. Total Alert Count (All time & Recent)
        const totalAlerts = await Alert.countDocuments();
        const recentAlerts = await Alert.countDocuments({ timestamp: { $gte: timeAgo } });
        
        // 2. Count by Severity (for Pie Chart)
        const severityStats = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            { $group: { _id: "$severity", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // 3. Count by Engine (for Bar Chart)
        const engineStats = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            { $group: { _id: "$engine", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // 4. Recent CRITICAL Incidents (for War Room widget)
        const recentCritical = await Alert.find({ 
            severity: 'Critical',
            timestamp: { $gte: timeAgo }
        })
        .sort({ timestamp: -1 })
        .limit(5)
        .select('engine alertType details timestamp');
        
        // 5. Correlation Brain Incidents
        const correlationIncidents = await Alert.find({ 
            engine: "CORRELATION BRAIN",
            timestamp: { $gte: timeAgo }
        })
        .sort({ timestamp: -1 })
        .limit(10);
        
        // 6. Hourly Trend (for Line Chart)
        const hourlyTrend = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            { 
                $group: {
                    _id: { 
                        $dateToString: { 
                            format: "%Y-%m-%d %H:00", 
                            date: "$timestamp" 
                        }
                    },
                    count: { $sum: 1 },
                    critical: { 
                        $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] }
                    },
                    high: { 
                        $sum: { $cond: [{ $eq: ["$severity", "High"] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 7. Top Targeted Entities (IPs/Users)
        const topEntities = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$details.target_entity",
                            { $ifNull: [
                                "$details.ip_address",
                                { $ifNull: ["$details.source_ip", "$details.user_id"] }
                            ]}
                        ]
                    },
                    count: { $sum: 1 },
                    maxSeverity: { $max: "$severity" },
                    engines: { $addToSet: "$engine" }
                }
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        // 8. Engine Activity Summary
        const engineActivity = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            {
                $group: {
                    _id: "$engine",
                    total: { $sum: 1 },
                    critical: { $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] } },
                    high: { $sum: { $cond: [{ $eq: ["$severity", "High"] }, 1, 0] } },
                    medium: { $sum: { $cond: [{ $eq: ["$severity", "Medium"] }, 1, 0] } },
                    low: { $sum: { $cond: [{ $eq: ["$severity", "Low"] }, 1, 0] } }
                }
            }
        ]);
        
        // Format response
        const response = {
            overview: {
                total: totalAlerts,
                recent: recentAlerts,
                criticalCount: recentCritical.length,
                incidentCount: correlationIncidents.length
            },
            severity: severityStats,
            engines: engineStats,
            recentCritical: recentCritical,
            correlationIncidents: correlationIncidents,
            hourlyTrend: hourlyTrend,
            topEntities: topEntities,
            engineActivity: engineActivity,
            timeRange: { 
                hours, 
                from: timeAgo,
                to: new Date()
            }
        };
        
        console.log(`✅ Stats calculated: ${recentAlerts} recent alerts`);
        res.json(response);
        
    } catch (error) {
        console.error("❌ Stats Error:", error);
        res.status(500).json({ message: "Error calculating stats", error: error.message });
    }
});

// PATCH /api/alerts/:id/status - Update incident status
app.patch('/api/alerts/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // Validate status
        const validStatuses = ['New', 'Investigating', 'Resolved', 'False Positive'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }

        // Update the alert
        const updatedAlert = await Alert.findByIdAndUpdate(
            id,
            { status: status, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!updatedAlert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        console.log(`✅ Updated alert ${id} status: ${status}`);
        
        // Broadcast update to all clients
        io.emit('alert-updated', updatedAlert);

        res.json(updatedAlert);
    } catch (error) {
        console.error("❌ Status update error:", error);
        res.status(500).json({ message: "Error updating status", error: error.message });
    }
});
// GET /api/alerts - Retrieve alerts with pagination and filters
app.get('/api/alerts', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            severity, 
            engine,
            startDate,
            endDate,
            search
        } = req.query;
        
        // Build filter query
        let filter = {};
        
        if (severity) filter.severity = severity;
        if (engine) filter.engine = engine;
        
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }
        
        if (search) {
            filter.$or = [
                { alertType: { $regex: search, $options: 'i' } },
                { engine: { $regex: search, $options: 'i' } },
                { 'details.ip_address': { $regex: search, $options: 'i' } },
                { 'details.user_id': { $regex: search, $options: 'i' } }
            ];
        }
        
        // Execute query with pagination
        const alerts = await Alert.find(filter)
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        
        const count = await Alert.countDocuments(filter);
        
        res.json({
            alerts,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
        
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/incidents - Get correlation incidents only
app.get('/api/incidents', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const incidents = await Alert.find({ engine: "CORRELATION BRAIN" })
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .exec();
        
        res.json(incidents);
        
    } catch (error) {
        console.error("Error fetching incidents:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/alerts - Clear all alerts (for testing)
app.delete('/api/alerts', async (req, res) => {
    try {
        const result = await Alert.deleteMany({});
        console.log(`🗑️  Deleted ${result.deletedCount} alerts`);
        res.json({ message: `Deleted ${result.deletedCount} alerts` });
    } catch (error) {
        console.error("Error deleting alerts:", error);
        res.status(500).json({ error: error.message });
    }
});

// === WEBSOCKET ===
io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// === START SERVER ===
server.listen(PORT, () => {
    console.log("\n" + "=".repeat(60));
    console.log("  🛡️  AEGIS COMMAND CENTER - Backend Ready");
    console.log("=".repeat(60));
    console.log(`  Server: http://localhost:${PORT}`);
    console.log(`  WebSocket: Active`);
    console.log(`  Database: Connected`);
    console.log(`  Stats API: http://localhost:${PORT}/api/stats`);
    console.log("=".repeat(60) + "\n");
});

 /// === ADDITIONAL ENHANCEMENTS: RBAC & AUTHENTICATION =====
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Alert = require('./models/Alert');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this_in_production';

// ===== MIDDLEWARE =====

// Authenticate JWT token
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Verify Admin role
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    next();
};

// Verify Senior or Admin role
const verifySeniorOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'senior') {
        return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
    }
    next();
};

// ===== AUTHENTICATION ROUTES =====

// POST /api/auth/login - Enhanced Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if active
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is disabled' });
        }
        
        // Verify password
        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await user.updateLastLogin();
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user._id,
                username: user.username,
                role: user.role,
                assigned_ip: user.assigned_ip,
                assigned_host: user.assigned_host
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        console.log(`✅ User logged in: ${user.username} (${user.role})`);
        
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                assigned_ip: user.assigned_ip,
                assigned_host: user.assigned_host
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/register - Public registration (if needed)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, fullName, email } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Create new user (default role: employee)
        const user = new User({
            username: username.toLowerCase(),
            password, // Will be hashed by pre-save hook
            fullName,
            email,
            role: 'employee'
        });
        
        await user.save();
        
        res.json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== RBAC-FILTERED ALERTS ROUTES =====

// GET /api/alerts - Role-based filtered alerts
app.get('/api/alerts', authenticate, async (req, res) => {
    try {
        const { limit = 100, severity, engine, status } = req.query;
        let query = {};
        
        // Apply filters if provided
        if (severity) query.severity = severity;
        if (engine) query.engine = engine;
        if (status) query.status = status;
        
        // ===== RBAC LOGIC =====
        if (req.user.role === 'employee') {
            // Employees ONLY see alerts matching their assigned IP
            if (!req.user.assigned_ip) {
                return res.json({ alerts: [], total: 0 });
            }
            
            query.$or = [
                { 'details.ip_address': req.user.assigned_ip },
                { 'details.source_ip': req.user.assigned_ip },
                { 'details.destination_ip': req.user.assigned_ip },
                { 'details.target_entity': req.user.assigned_ip }
            ];
        }
        // Admins and Seniors see everything (no additional filters)
        
        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));
        
        const total = await Alert.countDocuments(query);
        
        res.json({ alerts, total });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/stats - Role-based statistics
app.get('/api/stats', authenticate, async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        let matchQuery = { timestamp: { $gte: timeAgo } };
        
        // ===== RBAC LOGIC =====
        if (req.user.role === 'employee') {
            // Employees only see their own stats
            if (!req.user.assigned_ip) {
                return res.json({
                    overview: { total: 0, recent: 0, criticalCount: 0, incidentCount: 0 },
                    severity: [],
                    engines: [],
                    hourlyTrend: [],
                    topEntities: [],
                    engineActivity: [],
                    recentCritical: [],
                    correlationIncidents: []
                });
            }
            
            matchQuery.$or = [
                { 'details.ip_address': req.user.assigned_ip },
                { 'details.source_ip': req.user.assigned_ip },
                { 'details.destination_ip': req.user.assigned_ip }
            ];
        } else if (req.user.role === 'admin') {
            // Admin sees high-level overview (less detail)
            // We'll return aggregated stats without detailed breakdowns
        }
        // Senior analysts see full detailed stats
        
        const stats = await Alert.aggregate([
            { $match: matchQuery },
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                recent: { $sum: 1 },
                                criticalCount: {
                                    $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
                                },
                                incidentCount: {
                                    $sum: { $cond: [{ $eq: ['$engine', 'CORRELATION BRAIN'] }, 1, 0] }
                                }
                            }
                        }
                    ],
                    severity: [
                        { $group: { _id: '$severity', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    engines: [
                        { $group: { _id: '$engine', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    hourlyTrend: [
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: '%Y-%m-%d %H:00',
                                        date: '$timestamp'
                                    }
                                },
                                count: { $sum: 1 },
                                critical: {
                                    $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
                                },
                                high: {
                                    $sum: { $cond: [{ $eq: ['$severity', 'High'] }, 1, 0] }
                                }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]
                }
            }
        ]);
        
        const result = stats[0];
        const overview = result.overview[0] || { recent: 0, criticalCount: 0, incidentCount: 0 };
        
        // Get total count (all time)
        const totalQuery = req.user.role === 'employee' 
            ? { $or: matchQuery.$or }
            : {};
        const total = await Alert.countDocuments(totalQuery);
        overview.total = total;
        
        // Return appropriate level of detail based on role
        if (req.user.role === 'admin') {
            // Admin: High-level overview only
            res.json({
                overview,
                severity: result.severity,
                engines: result.engines,
                // No detailed hourly trends for admin
                hourlyTrend: [],
                topEntities: [],
                engineActivity: [],
                recentCritical: [],
                correlationIncidents: []
            });
        } else {
            // Senior and Employee: Full details
            res.json({
                overview,
                severity: result.severity,
                engines: result.engines,
                hourlyTrend: result.hourlyTrend,
                topEntities: [],
                engineActivity: [],
                recentCritical: [],
                correlationIncidents: []
            });
        }
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN-ONLY USER MANAGEMENT ROUTES =====

// GET /api/admin/users - Get all users
app.get('/api/admin/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password')
            .sort({ createdAt: -1 });
        
        res.json({ users, total: users.length });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/admin/users - Create new user
app.post('/api/admin/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { username, password, role, fullName, email, assigned_ip, assigned_host } = req.body;
        
        // Validate required fields
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Create user
        const user = new User({
            username: username.toLowerCase(),
            password, // Will be hashed by pre-save hook
            role,
            fullName,
            email,
            assigned_ip,
            assigned_host,
            createdBy: req.user.username
        });
        
        await user.save();
        
        console.log(`👤 User created: ${user.username} (${user.role}) by ${req.user.username}`);
        
        res.json({ 
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                assigned_ip: user.assigned_ip
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/admin/users/:id - Update user
app.patch('/api/admin/users/:id', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Don't allow updating password through this route
        delete updates.password;
        
        const user = await User.findByIdAndUpdate(
            id,
            updates,
            { new: true, select: '-password' }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`👤 User updated: ${user.username} by ${req.user.username}`);
        
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/admin/users/:id - Delete user
app.delete('/api/admin/users/:id', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Don't allow deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`👤 User deleted: ${user.username} by ${req.user.username}`);
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== STATUS UPDATE WITH RBAC =====

// PATCH /api/alerts/:id/status - Update alert status (with RBAC)
app.patch('/api/alerts/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        
        const alert = await Alert.findById(id);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        
        // ===== RBAC LOGIC =====
        if (req.user.role === 'employee') {
            // Employees can only request review, not resolve
            const allowedStatuses = ['New', 'Review Requested'];
            if (!allowedStatuses.includes(status)) {
                return res.status(403).json({ 
                    error: 'Employees can only request review. Contact a senior analyst to resolve.' 
                });
            }
        }
        
        // Update status
        alert.status = status;
        await alert.save();
        
        console.log(`✅ Alert ${id} status updated to ${status} by ${req.user.username} (${req.user.role})`);
        
        // Broadcast update
        io.emit('alert-updated', alert);
        
        res.json(alert);
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
});

// ===== PROFILE ROUTE =====

// GET /api/auth/profile - Get current user profile
app.get('/api/auth/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id, '-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Export middleware for use in other files if needed
module.exports = {
    authenticate,
    verifyAdmin,
    verifySeniorOrAdmin
};