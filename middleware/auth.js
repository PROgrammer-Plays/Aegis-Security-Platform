// middleware/auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

/**
 * Verify JWT token and attach user to request
 * Usage: app.get('/protected', authenticate, (req, res) => {...})
 */
const authenticate = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.' 
        });
    }
    
    // Extract token (remove "Bearer " prefix)
    const token = authHeader.replace('Bearer ', '');
    
    try {
        // Verify and decode token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach user info to request
        req.user = decoded;
        
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(400).json({ 
            error: 'Invalid or expired token' 
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user if token is valid, otherwise continues
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return next();
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        // Don't fail, just continue without user
    }
    
    next();
};

module.exports = {
    authenticate,
    optionalAuth
};
