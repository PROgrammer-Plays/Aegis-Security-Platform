// models/User.js - Enhanced RBAC User Model
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
    // Employee-specific fields (for IP/hostname binding)
    assigned_ip: { 
        type: String, 
        default: null,
        index: true
    }, 
    assigned_host: { 
        type: String, 
        default: null 
    },
    // User profile
    fullName: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    // Timestamps
    lastLogin: {
        type: Date,
        default: null
    },
    createdBy: {
        type: String,
        default: 'system'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Static method to create default admin
UserSchema.statics.createDefaultAdmin = async function() {
    try {
        const adminExists = await this.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            const admin = new this({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@aegis.local',
                createdBy: 'system'
            });
            await admin.save();
            console.log('👑 Default Superuser created: admin/admin');
            return admin;
        }
        return null;
    } catch (error) {
        console.error('Error creating default admin:', error);
        throw error;
    }
};

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', UserSchema);