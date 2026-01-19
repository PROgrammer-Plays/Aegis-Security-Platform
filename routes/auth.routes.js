// routes/auth.routes.js - FIXED Authentication Routes (No Hooks Interference)
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * POST /api/auth/login
 * Login user and return JWT token
 * FIXED: Direct bcrypt comparison, no model methods
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log(`🔑 Login attempt: ${username}`);
        
        if (!username || !password) {
            console.log('❌ Missing username or password');
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // Find user - use .lean() to get plain object (no mongoose magic)
        const user = await User.findOne({ 
            username: username.toLowerCase() 
        }).lean();
        
        if (!user) {
            console.log(`❌ User not found: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log(`✅ User found: ${user.username}`);
        console.log(`🔍 Password hash (first 10 chars): ${user.password.substring(0, 10)}`);
        console.log(`🔍 Comparing password...`);
        
        // Check if active
        if (!user.isActive) {
            console.log(`❌ Account disabled: ${username}`);
            return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
        }
        
        // CRITICAL: Direct bcrypt comparison
        // Don't use user.comparePassword() or any model methods
        const validPassword = await bcrypt.compare(password, user.password);
        
        console.log(`🔍 Password comparison result: ${validPassword}`);
        
        if (!validPassword) {
            console.log(`❌ Invalid password for: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login - use direct DB update to avoid hooks
        await User.collection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                assigned_ip: user.assigned_ip,
                assigned_host: user.assigned_host
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        console.log(`✅ Login successful: ${user.username} (${user.role})`);
        console.log(`🎫 Token generated (first 20 chars): ${token.substring(0, 20)}...`);
        
        res.json({
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                email: user.email,
                assigned_ip: user.assigned_ip,
                assigned_host: user.assigned_host
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * POST /api/auth/register
 * Register new user (public - optional)
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, fullName, email } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash password directly
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert directly to avoid hooks
        await User.collection.insertOne({
            username: username.toLowerCase(),
            password: hashedPassword,
            fullName,
            email,
            role: 'employee',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log(`👤 New user registered: ${username}`);
        
        res.json({ 
            message: 'User registered successfully',
            username: username.toLowerCase()
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id, '-password').lean();
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/auth/change-password
 * Change user password
 */
router.patch('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user.id).lean();
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password - direct comparison
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update directly to avoid hooks
        await User.collection.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );
        
        console.log(`🔒 Password changed for: ${user.username}`);
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
