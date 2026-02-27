// models/Alert.js - Enhanced Alert Model with Escalation & Priority
const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    engine: {
        type: String,
        required: true,
        index: true
    },
    alertType: {
        type: String,
        required: true,
        index: true
    },
    severity: {
        type: String,
        required: true,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        index: true
    },
    status: {
        type: String,
        default: 'New',
        enum: ['New', 'Review Requested', 'In Progress', 'Resolved', 'False Positive'],
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    details: {
        type: Object,
        default: {}
    },
    
    // ===== ESCALATION & PRIORITY FEATURES =====
    isEscalated: {
        type: Boolean,
        default: false,
        index: true
    },
    escalatedBy: {
        type: String, // Admin username
        default: null
    },
    escalatedAt: {
        type: Date,
        default: null
    },
    escalationReason: {
        type: String,
        default: null
    },
    escalationPriority: {
        type: String,
        enum: ['Normal', 'High', 'Critical', 'Immediate'],
        default: 'Normal',
        index: true
    },
    escalationNotes: {
        type: String,
        default: null
    },
    
    // Assignment
    assignedTo: {
        type: String, // Senior analyst username
        default: null,
        index: true
    },
    assignedAt: {
        type: Date,
        default: null
    },
    
    // Resolution
    resolvedBy: {
        type: String,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    resolutionNotes: {
        type: String,
        default: null
    },
    
    // Investigation
    investigationStarted: {
        type: Boolean,
        default: false
    },
    investigationStartedAt: {
        type: Date,
        default: null
    },
    investigationStartedBy: {
        type: String,
        default: null
    },
    investigationNotes: [{
        timestamp: Date,
        author: String,
        note: String
    }]
}, {
    timestamps: true
});

// Index for war room queries (escalated + critical/high)
AlertSchema.index({ isEscalated: 1, severity: 1, timestamp: -1 });
AlertSchema.index({ assignedTo: 1, status: 1 });
AlertSchema.index({ severity: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
