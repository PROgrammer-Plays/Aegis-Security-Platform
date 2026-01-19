// middleware/rbac.js - Role-Based Access Control Middleware
const User = require('../models/User');

/**
 * Verify user has admin role
 * Usage: app.post('/admin/users', authenticate, verifyAdmin, (req, res) => {...})
 */
const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required' 
        });
    }
    
    if (req.user.role !== 'admin') {
        console.log(`🚫 Access denied: ${req.user.username} (${req.user.role}) attempted admin action`);
        return res.status(403).json({ 
            error: 'Access denied. Administrators only.' 
        });
    }
    
    next();
};

/**
 * Verify user has senior or admin role
 * Usage: app.get('/incidents', authenticate, verifySeniorOrAdmin, (req, res) => {...})
 */
const verifySeniorOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required' 
        });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'senior') {
        console.log(`🚫 Access denied: ${req.user.username} (${req.user.role}) needs senior+ access`);
        return res.status(403).json({ 
            error: 'Access denied. Senior analyst or administrator access required.' 
        });
    }
    
    next();
};

/**
 * Verify user can only access their own resources
 * For employee role - restricts to assigned_ip
 */
const verifyOwnResource = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required' 
        });
    }
    
    // Admins and seniors can access everything
    if (req.user.role === 'admin' || req.user.role === 'senior') {
        return next();
    }
    
    // Employees need assigned_ip to access resources
    if (req.user.role === 'employee') {
        if (!req.user.assigned_ip) {
            return res.status(403).json({ 
                error: 'No IP address assigned. Contact administrator.' 
            });
        }
    }
    
    next();
};

/**
 * Build MongoDB query filter based on user role
 * Returns query object to filter alerts by role
 */
const buildRoleFilter = (user, baseQuery = {}) => {
    // Admin and Senior: See everything
    if (user.role === 'admin' || user.role === 'senior') {
        return baseQuery;
    }
    
    // Employee: Only see their assigned IP
    if (user.role === 'employee') {
        if (!user.assigned_ip) {
            // No assigned IP = no results
            return { _id: { $exists: false } }; // Empty result set
        }
        
        return {
            ...baseQuery,
            $or: [
                { 'details.ip_address': user.assigned_ip },
                { 'details.source_ip': user.assigned_ip },
                { 'details.destination_ip': user.assigned_ip },
                { 'details.target_entity': user.assigned_ip }
            ]
        };
    }
    
    // Unknown role: Deny
    return { _id: { $exists: false } };
};

/**
 * Verify action permissions based on role
 * Employees can only request review, not resolve
 */
const verifyAlertAction = (req, res, next) => {
    const { status } = req.body;
    
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required' 
        });
    }
    
    // Employees can only set specific statuses
    if (req.user.role === 'employee') {
        const allowedStatuses = ['New', 'Review Requested'];
        
        if (!allowedStatuses.includes(status)) {
            return res.status(403).json({ 
                error: 'Employees can only request review. Contact a senior analyst to resolve incidents.' 
            });
        }
    }
    
    // Admins and seniors can set any status
    next();
};

module.exports = {
    verifyAdmin,
    verifySeniorOrAdmin,
    verifyOwnResource,
    buildRoleFilter,
    verifyAlertAction
};
