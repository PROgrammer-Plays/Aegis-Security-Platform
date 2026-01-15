// models/Alert.js (Enhanced Version)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const alertSchema = new Schema({
    engine: {
        type: String, 
        required: true,
        enum: ['IDS', 'Traffic Engine', 'Threat Intelligence', 'UEBA', 'Artifact Engine'],
        index: true
    },
    severity: {
        type: String, 
        required: true,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        index: true
    },
    alertType: {
        type: String, 
        required: true,
        index: true
    },
    timestamp: {
        type: Date, 
        default: Date.now,
        index: true
    },
    details: {
        type: Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'acknowledged', 'investigating', 'resolved', 'false-positive'],
        default: 'new',
        index: true
    },
    assignedTo: {
        type: String,
        default: null
    },
    notes: [{
        text: String,
        author: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    resolvedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound indexes for common queries
alertSchema.index({ engine: 1, severity: 1 });
alertSchema.index({ timestamp: -1, severity: 1 });
alertSchema.index({ status: 1, timestamp: -1 });

// TTL index - automatically delete alerts older than 90 days (optional)
// Uncomment if you want automatic cleanup
// alertSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Virtual for alert age
alertSchema.virtual('age').get(function() {
    return Date.now() - this.timestamp;
});

// Instance method to acknowledge alert
alertSchema.methods.acknowledge = function(user) {
    this.status = 'acknowledged';
    this.assignedTo = user;
    return this.save();
};

// Instance method to resolve alert
alertSchema.methods.resolve = function(user, note) {
    this.status = 'resolved';
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

// Pre-save hook for logging
alertSchema.pre('save', function(next) {
    if (this.isNew) {
        console.log(`New ${this.severity} alert from ${this.engine}: ${this.alertType}`);
    }
    next();
});

module.exports = mongoose.model('Alert', alertSchema);
