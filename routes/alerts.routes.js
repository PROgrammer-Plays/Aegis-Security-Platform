// routes/alerts.routes.js - Alerts CRUD Routes
const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { buildRoleFilter, verifyAlertAction } = require('../middleware/rbac');
const { broadcastNewAlert, broadcastAlertUpdate } = require('../services/socket.service');

/**
 * POST /api/alerts
 * Create new alert (from detector or manual)
 */
router.post('/', optionalAuth, async (req, res) => {
    try {
        console.log(`\n[${new Date().toISOString()}] New alert received`);
        console.log(`Engine: ${req.body.engine}`);
        console.log(`Type: ${req.body.alertType}`);
        console.log(`Severity: ${req.body.severity}`);
        
        const alert = new Alert(req.body);
        const savedAlert = await alert.save();
        
        console.log(`✅ Alert saved (ID: ${savedAlert._id})`);
        
        // Broadcast to all connected clients
        broadcastNewAlert(savedAlert);
        
        res.status(201).json(savedAlert);
    } catch (error) {
        console.error("❌ Error saving alert:", error);
        res.status(400).json({ 
            message: "Error saving alert", 
            error: error.message 
        });
    }
});

/**
 * GET /api/alerts
 * Get alerts with RBAC filtering
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 100, severity, engine, status, skip = 0 } = req.query;
        
        // Build base query from filters
        let baseQuery = {};
        if (severity) baseQuery.severity = severity;
        if (engine) baseQuery.engine = engine;
        if (status) baseQuery.status = status;
        
        // Apply RBAC filtering
        const query = buildRoleFilter(req.user, baseQuery);
        
        console.log(`📊 Fetching alerts for ${req.user.username} (${req.user.role})`);
        
        // Fetch alerts
        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        
        // Get total count
        const total = await Alert.countDocuments(query);
        
        res.json({ 
            alerts, 
            total,
            count: alerts.length
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Server error fetching alerts' });
    }
});

/**
 * GET /api/alerts/:id
 * Get single alert by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        // Check if user has access to this alert (RBAC)
        const query = buildRoleFilter(req.user, { _id: id });
        const hasAccess = await Alert.findOne(query);
        
        if (!hasAccess) {
            return res.status(403).json({ 
                error: 'Access denied to this alert' 
            });
        }
        
        res.json(alert);
    } catch (error) {
        console.error('Error fetching alert:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/alerts/:id/status
 * Update alert status (with RBAC)
 */
router.patch('/:id/status', authenticate, verifyAlertAction, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        // Update status
        alert.status = status;
        await alert.save();
        
        console.log(`✅ Alert ${id} status → ${status} by ${req.user.username} (${req.user.role})`);
        
        // Broadcast update
        broadcastAlertUpdate(alert);
        
        res.json(alert);
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Server error updating status' });
    }
});

/**
 * DELETE /api/alerts/:id
 * Delete alert (Admin only)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        // Only admins can delete
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Only administrators can delete alerts' 
            });
        }
        
        const { id } = req.params;
        
        const alert = await Alert.findByIdAndDelete(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        console.log(`🗑️  Alert ${id} deleted by ${req.user.username}`);
        
        res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
