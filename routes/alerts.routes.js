// routes/alerts.routes.js - Enhanced Alerts Routes with Escalation
const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { buildRoleFilter, verifyAlertAction, verifyAdmin } = require('../middleware/rbac');
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
        const { limit = 100, severity, engine, status, skip = 0, escalated } = req.query;
        
        // Build base query from filters
        let baseQuery = {};
        if (severity) baseQuery.severity = severity;
        if (engine) baseQuery.engine = engine;
        if (status) baseQuery.status = status;
        if (escalated === 'true') baseQuery.isEscalated = true;
        
        // Apply RBAC filtering
        const query = buildRoleFilter(req.user, baseQuery);
        
        console.log(`📊 Fetching alerts for ${req.user.username} (${req.user.role})`);
        
        // Fetch alerts
        const alerts = await Alert.find(query)
            .sort({ 
                isEscalated: -1, // Escalated first
                escalationPriority: 1, // Then by priority
                timestamp: -1  // Then by time
            })
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
        const { status, resolutionNotes } = req.body;
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        // Update status
        alert.status = status;
        
        // If resolved, record resolution
        if (status === 'Resolved' || status === 'False Positive') {
            alert.resolvedBy = req.user.username;
            alert.resolvedAt = new Date();
            if (resolutionNotes) {
                alert.resolutionNotes = resolutionNotes;
            }
        }
        
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
 * PATCH /api/alerts/:id/escalate
 * Escalate alert (Admin only)
 */
router.patch('/:id/escalate', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            priority = 'High', 
            reason, 
            assignTo, 
            notes 
        } = req.body;
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        // Mark as escalated
        alert.isEscalated = true;
        alert.escalatedBy = req.user.username;
        alert.escalatedAt = new Date();
        alert.escalationReason = reason || 'Escalated by administrator';
        alert.escalationPriority = priority;
        alert.escalationNotes = notes;
        
        // Assign to senior analyst if specified
        if (assignTo) {
            alert.assignedTo = assignTo;
            alert.assignedAt = new Date();
        }
        
        // Update status if still new
        if (alert.status === 'New') {
            alert.status = 'In Progress';
        }
        
        await alert.save();
        
        console.log(`🚨 Alert ${id} escalated to ${priority} priority by ${req.user.username}`);
        if (assignTo) {
            console.log(`   → Assigned to: ${assignTo}`);
        }
        
        // Broadcast update
        broadcastAlertUpdate(alert);
        
        res.json({
            message: 'Alert escalated successfully',
            alert
        });
    } catch (error) {
        console.error('Escalation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/alerts/:id/de-escalate
 * Remove escalation (Admin only)
 */
router.patch('/:id/de-escalate', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        alert.isEscalated = false;
        alert.escalationPriority = 'Normal';
        
        await alert.save();
        
        console.log(`✅ Alert ${id} de-escalated by ${req.user.username}`);
        
        broadcastAlertUpdate(alert);
        
        res.json({
            message: 'Escalation removed',
            alert
        });
    } catch (error) {
        console.error('De-escalation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/alerts/:id/assign
 * Assign alert to senior analyst (Admin only)
 */
router.patch('/:id/assign', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { assignTo } = req.body;
        
        if (!assignTo) {
            return res.status(400).json({ error: 'assignTo username required' });
        }
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        alert.assignedTo = assignTo;
        alert.assignedAt = new Date();
        
        if (alert.status === 'New') {
            alert.status = 'In Progress';
        }
        
        await alert.save();
        
        console.log(`👤 Alert ${id} assigned to ${assignTo} by ${req.user.username}`);
        
        broadcastAlertUpdate(alert);
        
        res.json({
            message: `Alert assigned to ${assignTo}`,
            alert
        });
    } catch (error) {
        console.error('Assignment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/alerts/:id/investigate
 * Start investigation (Senior/Admin)
 */
router.patch('/:id/investigate', authenticate, async (req, res) => {
    try {
        // Only senior and admin can investigate
        if (req.user.role !== 'admin' && req.user.role !== 'senior') {
            return res.status(403).json({ 
                error: 'Only senior analysts and administrators can start investigations' 
            });
        }
        
        const { id } = req.params;
        const { note } = req.body;
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        if (!alert.investigationStarted) {
            alert.investigationStarted = true;
            alert.investigationStartedAt = new Date();
            alert.investigationStartedBy = req.user.username;
        }
        
        // Add investigation note
        if (note) {
            alert.investigationNotes.push({
                timestamp: new Date(),
                author: req.user.username,
                note: note
            });
        }
        
        // Update status
        if (alert.status === 'New') {
            alert.status = 'In Progress';
        }
        
        await alert.save();
        
        console.log(`🔍 Investigation started on alert ${id} by ${req.user.username}`);
        
        broadcastAlertUpdate(alert);
        
        res.json({
            message: 'Investigation started',
            alert
        });
    } catch (error) {
        console.error('Investigation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/alerts/:id/notes
 * Add investigation note (Senior/Admin)
 */
router.post('/:id/notes', authenticate, async (req, res) => {
    try {
        // Only senior and admin
        if (req.user.role !== 'admin' && req.user.role !== 'senior') {
            return res.status(403).json({ 
                error: 'Only senior analysts and administrators can add notes' 
            });
        }
        
        const { id } = req.params;
        const { note } = req.body;
        
        if (!note) {
            return res.status(400).json({ error: 'Note is required' });
        }
        
        const alert = await Alert.findById(id);
        
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        
        alert.investigationNotes.push({
            timestamp: new Date(),
            author: req.user.username,
            note: note
        });
        
        await alert.save();
        
        console.log(`📝 Note added to alert ${id} by ${req.user.username}`);
        
        broadcastAlertUpdate(alert);
        
        res.json({
            message: 'Note added',
            alert
        });
    } catch (error) {
        console.error('Note error:', error);
        res.status(500).json({ error: 'Server error' });
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
