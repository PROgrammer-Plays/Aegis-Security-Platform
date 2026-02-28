// models/User.js - COMPLETE with Password System Support
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
        enum: ['admin', 'senior', 'employee'], 
        default: 'employee',
        index: true
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
        default: '',
        lowercase: true,
        trim: true
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
    
    // Password Reset
    passwordReset: {
        token: {
            type: String,
            default: null
        },
        expires: {
            type: Date,
            default: null
        },
        requestedAt: {
            type: Date,
            default: null
        }
    },
    
    // Temporary Password - UPDATED with reason field!
    temporaryPassword: {
        hash: {
            type: String,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        },
        mustChange: {
            type: Boolean,
            default: true
        },
        reason: {  // NEW!
            type: String,
            enum: ['temporary', 'master_reset', 'admin_reset'],
            default: 'temporary'
        }
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
    return this.save();
};

/**
 * Check if password reset token is valid
 */
UserSchema.methods.isPasswordResetValid = function() {
    if (!this.passwordReset || !this.passwordReset.token || !this.passwordReset.expires) {
        return false;
    }
    return this.passwordReset.expires > new Date();
};

/**
 * Check if temporary password is valid
 */
UserSchema.methods.isTemporaryPasswordValid = function() {
    if (!this.temporaryPassword || !this.temporaryPassword.hash || !this.temporaryPassword.expiresAt) {
        return false;
    }
    return this.temporaryPassword.expiresAt > new Date();
};

// ===== PRE-SAVE HOOK =====
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