// server.js (Enhanced Version with All Fixes)

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

// --- 1. SETUP ---
const app = express();
const PORT = process.env.BackEnd_PORT || 5000;

// --- 2. MIDDLEWARE ---
app.use(cors()); // Standard CORS for your REST API
app.use(express.json()); // To parse JSON bodies

// --- 3. DATABASE CONNECTION ---
mongoose.connect(process.env.ATLAS_URI)
    .then(() => console.log("MongoDB database connection established successfully"))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1); // Exit if database connection fails
    });

// --- 4. CREATE A SINGLE HTTP SERVER & SOCKET.IO INSTANCE ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// --- 5. DEFINE THE ALERT MODEL ---
const Alert = require('./models/Alert');

// --- 6. INPUT VALIDATION MIDDLEWARE ---
const validateAlert = (req, res, next) => {
    const { engine, severity, alertType } = req.body;
    
    if (!engine || !severity || !alertType) {
        return res.status(400).json({ 
            message: "Missing required fields", 
            required: ["engine", "severity", "alertType"] 
        });
    }
    
    const validEngines = ["IDS", "Traffic Engine", "Threat Intelligence", "UEBA", "Artifact Engine"];
    const validSeverities = ["Low", "Medium", "High", "Critical"];
    
    if (!validEngines.includes(engine)) {
        return res.status(400).json({ 
            message: "Invalid engine", 
            validEngines 
        });
    }
    
    if (!validSeverities.includes(severity)) {
        return res.status(400).json({ 
            message: "Invalid severity", 
            validSeverities 
        });
    }
    
    next();
};

// --- 7. API ENDPOINTS ---

// POST: Create new alert
app.post('/api/alerts', validateAlert, async (req, res) => {
    console.log("Received new alert via POST request.....");
    const newAlert = new Alert(req.body);
    
    try {
        const savedAlert = await newAlert.save();
        console.log("Alert saved to database:", savedAlert._id);
        
        console.log(`[DEBUG] Broadcasting 'new-alert' to ${io.engine.clientsCount} connected clients.`);
        
        // Broadcast to all connected clients
        io.emit('new-alert', savedAlert);
        
        console.log("Broadcasted new alert to connected clients.");
        res.status(201).json(savedAlert);

    } catch (error) {
        console.error("Error saving alert:", error);
        res.status(400).json({ message: "Error saving alert", error: error.message });
    }
});

// GET: Fetch recent alerts with pagination
app.get('/api/alerts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        const severity = req.query.severity;
        const engine = req.query.engine;
        
        // Build query
        let query = {};
        if (severity) query.severity = severity;
        if (engine) query.engine = engine;
        
        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip);
        
        const total = await Alert.countDocuments(query);
        
        res.json({
            alerts,
            total,
            limit,
            skip
        });
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ message: "Error fetching alerts", error: error.message });
    }
});

// GET: Fetch single alert by ID
app.get('/api/alerts/:id', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }
        res.json(alert);
    } catch (error) {
        console.error("Error fetching alert:", error);
        res.status(500).json({ message: "Error fetching alert", error: error.message });
    }
});

// GET: Alert statistics
app.get('/api/alerts/stats/summary', async (req, res) => {
    try {
        const total = await Alert.countDocuments();
        
        const bySeverity = await Alert.aggregate([
            { $group: { _id: "$severity", count: { $sum: 1 } } }
        ]);
        
        const byEngine = await Alert.aggregate([
            { $group: { _id: "$engine", count: { $sum: 1 } } }
        ]);
        
        const recent = await Alert.countDocuments({
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        res.json({
            total,
            recentLast24h: recent,
            bySeverity: bySeverity.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byEngine: byEngine.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error("Error fetching statistics:", error);
        res.status(500).json({ message: "Error fetching statistics", error: error.message });
    }
});

// DELETE: Clear old alerts (optional - for testing)
app.delete('/api/alerts/clear/all', async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ message: "Not allowed in production" });
        }
        
        const result = await Alert.deleteMany({});
        res.json({ message: `Deleted ${result.deletedCount} alerts` });
    } catch (error) {
        console.error("Error clearing alerts:", error);
        res.status(500).json({ message: "Error clearing alerts", error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        connectedClients: io.engine.clientsCount
    };
    res.json(health);
});

// --- 8. WEBSOCKET CONNECTION LOGIC ---
io.on('connection', (socket) => {
    console.log(`[OK] A user connected via WebSocket: ${socket.id}`);
    
    // Send current statistics on connection
    Alert.countDocuments().then(count => {
        socket.emit('initial-stats', { totalAlerts: count });
    });
    
    socket.on('disconnect', () => {
        console.log(`[DISCONNECT] User disconnected: ${socket.id}`);
    });
    
    // Handle client requesting recent alerts
    socket.on('request-recent-alerts', async (data) => {
        try {
            const limit = data?.limit || 20;
            const alerts = await Alert.find()
                .sort({ timestamp: -1 })
                .limit(limit);
            socket.emit('recent-alerts', alerts);
        } catch (error) {
            console.error("Error fetching recent alerts:", error);
            socket.emit('error', { message: "Failed to fetch recent alerts" });
        }
    });
});

// --- 9. ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ 
        message: "Internal server error", 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

// --- 10. GRACEFUL SHUTDOWN ---
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server gracefully...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('Server closed');
            process.exit(0);
        });
    });
});

// --- 11. START THE SERVER ---
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = { app, server, io }; // Export for testing
