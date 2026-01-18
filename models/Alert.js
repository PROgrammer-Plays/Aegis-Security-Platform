// models/Alert.js - Fixed and Enhanced Version
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const alertSchema = new Schema({
    // Engine field - Added CORRELATION BRAIN
    engine: {
        type: String, 
        required: true,
        enum: [
            'IDS', 
            'Traffic Engine', 
            'Threat Intelligence', 
            'UEBA', 
            'Artifact Engine',
            'CORRELATION BRAIN'  // ✅ Added for correlated incidents
        ],
        index: true
    },
    
    // Severity field
    severity: {
        type: String, 
        required: true,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        index: true
    },
    
    // Alert type
    alertType: {
        type: String, 
        required: true,
        index: true
    },
    
    // Timestamp
    timestamp: {
        type: Date, 
        default: Date.now,
        index: true
    },
    
    // Alert details (flexible schema)
    details: {
        type: Schema.Types.Mixed,
        required: true
    },
    
    // ✅ FIXED: Status enum with matching case from frontend
    status: {
        type: String,
        enum: ['New', 'Investigating', 'Resolved', 'False Positive', 'Review Requested'],
        default: 'New',
        index: true
    },
    
    // Assignment tracking
    assignedTo: {
        type: String,
        default: null
    },
    
    // Notes for investigation
    notes: [{
        text: String,
        author: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Resolution tracking
    resolvedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound indexes for common queries
alertSchema.index({ engine: 1, severity: 1 });
alertSchema.index({ timestamp: -1, severity: 1 });
alertSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ engine: 1, timestamp: -1 });

// TTL index - automatically delete alerts older than 90 days (OPTIONAL)
// Uncomment if you want automatic cleanup:
// alertSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Virtual for alert age in milliseconds
alertSchema.virtual('age').get(function() {
    return Date.now() - this.timestamp;
});

// Virtual for alert age in human-readable format
alertSchema.virtual('ageFormatted').get(function() {
    const ms = Date.now() - this.timestamp;
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
});

// ✅ Instance method to start investigating
alertSchema.methods.investigate = function(user) {
    this.status = 'Investigating';
    this.assignedTo = user;
    return this.save();
};

// ✅ Instance method to resolve alert
alertSchema.methods.resolve = function(user, note) {
    this.status = 'Resolved';
    this.resolvedAt = new Date();
    if (note) {
        this.notes.push({
            text: note,
            author: user,
            timestamp: new Date()
        });
    }
    return this.save();
};

// ✅ Instance method to mark as false positive
alertSchema.methods.markFalsePositive = function(user, reason) {
    this.status = 'False Positive';
    this.resolvedAt = new Date();
    if (reason) {
        this.notes.push({
            text: `Marked as false positive: ${reason}`,
            author: user,
            timestamp: new Date()
        });
    }
    return this.save();
};

// Instance method to add a note
alertSchema.methods.addNote = function(text, author) {
    this.notes.push({
        text,
        author,
        timestamp: new Date()
    });
    return this.save();
};

// Static method to get recent alerts by severity
alertSchema.statics.findBySeverity = function(severity, limit = 10) {
    return this.find({ severity })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get alerts by engine
alertSchema.statics.findByEngine = function(engine, limit = 10) {
    return this.find({ engine })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// ✅ Static method to get active incidents (for War Room)
alertSchema.statics.findActiveIncidents = function() {
    return this.find({ 
        $or: [
            { engine: 'CORRELATION BRAIN' },
            { severity: 'Critical' }
        ],
        status: { $in: ['New', 'Investigating'] }
    })
    .sort({ timestamp: -1 });
};

// ✅ Static method to get correlation incidents only
alertSchema.statics.findCorrelationIncidents = function(limit = 20) {
    return this.find({ engine: 'CORRELATION BRAIN' })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get statistics
alertSchema.statics.getStatistics = async function(hoursAgo = 24) {
    const timeAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const stats = await this.aggregate([
        { $match: { timestamp: { $gte: timeAgo } } },
        {
            $facet: {
                bySeverity: [
                    { $group: { _id: '$severity', count: { $sum: 1 } } }
                ],
                byEngine: [
                    { $group: { _id: '$engine', count: { $sum: 1 } } }
                ],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                total: [
                    { $count: 'count' }
                ]
            }
        }
    ]);
    
    return stats[0];
};

// Pre-save hook for logging
alertSchema.pre('save', function(next) {
    if (this.isNew) {
        console.log(`📝 New ${this.severity} alert from ${this.engine}: ${this.alertType}`);
    } else if (this.isModified('status')) {
        console.log(`🔄 Alert ${this._id} status changed to: ${this.status}`);
    }
    next();
});

// Pre-update hook to set resolvedAt when status changes to Resolved
alertSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    
    // If status is being updated to Resolved or False Positive
    if (update.status === 'Resolved' || update.status === 'False Positive') {
        if (!update.resolvedAt) {
            this.set({ resolvedAt: new Date() });
        }
    }
    
    next();
});

module.exports = mongoose.model('Alert', alertSchema);
