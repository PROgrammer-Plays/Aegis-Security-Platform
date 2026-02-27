// models/User.js - Enhanced User Model with Custom Roles & Access Requests
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'senior', 'employee', 'custom'], 
        default: 'employee',
        index: true
    },
    customRole: {
        type: String,
        default: null
    },
    permissions: {
        viewAlerts: { type: Boolean, default: true },
        createAlerts: { type: Boolean, default: false },
        updateAlerts: { type: Boolean, default: false },
        deleteAlerts: { type: Boolean, default: false },
        viewUsers: { type: Boolean, default: false },
        manageUsers: { type: Boolean, default: false },
        viewStats: { type: Boolean, default: true },
        viewDetailedStats: { type: Boolean, default: false },
        accessWarRoom: { type: Boolean, default: false },
        accessForensics: { type: Boolean, default: false },
        manageRoles: { type: Boolean, default: false }
    },
    assigned_ip: { 
        type: String, 
        default: null,
        index: true
    }, 
    assigned_host: { 
        type: String, 
        default: null 
    },
    fullName: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockReason: {
        type: String,
        default: null
    },
    lockedAt: {
        type: Date,
        default: null
    },
    unlockRequestPending: {
        type: Boolean,
        default: false
    },
    unlockRequestMessage: {
        type: String,
        default: null
    },
    unlockRequestedAt: {
        type: Date,
        default: null
    },
    passwordResetRequested: {
        type: Boolean,
        default: false
    },
    passwordResetRequestMessage: {
        type: String,
        default: null
    },
    passwordResetRequestedAt: {
        type: Date,
        default: null
    },
    allowPasswordlessLogin: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    createdBy: {
        type: String,
        default: 'system'
    }
}, {
    timestamps: true
});

// ===== INSTANCE METHODS =====

/**
 * Compare password with hashed password
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};

/**
 * Update last login timestamp
 */
UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

/**
 * Lock user account
 */
UserSchema.methods.lockAccount = function(reason) {
    this.isLocked = true;
    this.lockReason = reason;
    this.lockedAt = new Date();
    return this.save();
};

/**
 * Unlock user account
 */
UserSchema.methods.unlockAccount = function() {
    this.isLocked = false;
    this.lockReason = null;
    this.lockedAt = null;
    this.unlockRequestPending = false;
    this.unlockRequestMessage = null;
    this.unlockRequestedAt = null;
    return this.save();
};

/**
 * Request unlock
 */
UserSchema.methods.requestUnlock = function(message) {
    this.unlockRequestPending = true;
    this.unlockRequestMessage = message;
    this.unlockRequestedAt = new Date();
    return this.save();
};

/**
 * Request password reset
 */
UserSchema.methods.requestPasswordReset = function(message) {
    this.passwordResetRequested = true;
    this.passwordResetRequestMessage = message;
    this.passwordResetRequestedAt = new Date();
    return this.save();
};

// ===== PRE-SAVE HOOK (CONDITIONAL) =====
// Only hash if password is modified AND not already hashed
UserSchema.pre('save', async function(next) {
    // Skip if password wasn't modified
    if (!this.isModified('password')) {
        return next();
    }
    
    // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
    if (this.password.startsWith('$2b$') || this.password.startsWith('$2a$')) {
        console.log('⚠️  Password already hashed, skipping hash');
        return next();
    }
    
    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('🔒 Password hashed on save');
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', UserSchema);
