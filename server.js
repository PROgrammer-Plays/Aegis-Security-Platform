// server.js - AEGIS Command Center Backend
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
        
        if (severity) {
            filter.severity = severity;
        }
        
        if (engine) {
            filter.engine = engine;
        }
        
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

// GET /api/stats - Dashboard statistics
app.get('/api/stats', async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        // 1. Total alerts
        const total = await Alert.countDocuments();
        const recent = await Alert.countDocuments({ timestamp: { $gte: timeAgo } });
        
        // 2. Severity breakdown
        const severityCounts = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            { $group: { _id: "$severity", count: { $sum: 1 } } }
        ]);
        
        // 3. Engine breakdown
        const engineCounts = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            { $group: { _id: "$engine", count: { $sum: 1 } } }
        ]);
        
        // 4. Recent incidents (Correlation Brain)
        const recentIncidents = await Alert.find({ 
            engine: "CORRELATION BRAIN",
            timestamp: { $gte: timeAgo }
        })
        .sort({ timestamp: -1 })
        .limit(10);
        
        // 5. Hourly trend
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
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 6. Top entities (IPs/Users)
        const topEntities = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$details.ip_address",
                            { $ifNull: ["$details.source_ip", "$details.user_id"] }
                        ]
                    },
                    count: { $sum: 1 },
                    maxSeverity: { $max: "$severity" }
                }
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        res.json({
            overview: {
                total,
                recent,
                incidents: recentIncidents.length
            },
            severityCounts: severityCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            engineCounts: engineCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            recentIncidents,
            hourlyTrend,
            topEntities,
            timeRange: { hours, from: timeAgo }
        });
        
    } catch (error) {
        console.error("Error fetching stats:", error);
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

// GET /api/alert/:id - Get single alert details
app.get('/api/alert/:id', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        
        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }
        
        res.json(alert);
        
    } catch (error) {
        console.error("Error fetching alert:", error);
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
    console.log("=".repeat(60) + "\n");
});
