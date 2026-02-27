// models/CustomRole.js - Custom Roles Defined by Admin
const mongoose = require('mongoose');

const CustomRoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    displayName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
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
    createdBy: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CustomRole', CustomRoleSchema);
