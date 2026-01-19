// models/User.js - Fixed User Model (No Double Hashing)
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
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
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

// ===== STATIC METHODS =====

/**
 * Create default admin (no longer used - moved to service)
 */
UserSchema.statics.createDefaultAdmin = async function() {
    console.log('⚠️  Use admin.service.js createDefaultAdmin() instead');
    return null;
};

// ===== PRE-SAVE HOOK (CONDITIONAL) =====
// IMPORTANT: Only hash if password is modified AND not already hashed
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