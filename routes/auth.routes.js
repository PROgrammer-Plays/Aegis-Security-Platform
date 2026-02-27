// routes/auth.routes.js - Enhanced Auth with Passwordless Login & Requests
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * POST /api/auth/login
 * Login with support for passwordless login
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log(`🔑 Login attempt: ${username}`);
        
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
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
        
        // Check if account is locked
        if (user.isLocked) {
            console.log(`🔒 Account locked: ${username}`);
            return res.status(403).json({ 
                error: 'Account is locked',
                reason: user.lockReason,
                message: 'Your account has been locked. Please contact an administrator or submit an unlock request.'
            });
        }
        
        // Check if account is active
        if (!user.isActive) {
            console.log(`❌ Account disabled: ${username}`);
            return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
        }
        
        // PASSWORDLESS LOGIN CHECK
        if (user.allowPasswordlessLogin) {
            console.log(`🔓 Passwordless login allowed for: ${username}`);
            
            // Allow login without password
            // Update last login
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
            
            console.log(`✅ Passwordless login successful: ${user.username} (${user.role})`);
            
            return res.json({
                token,
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName,
                    email: user.email,
                    assigned_ip: user.assigned_ip,
                    assigned_host: user.assigned_host,
                    mustChangePassword: true // Flag to force password change
                },
                message: 'Passwordless login successful. Please change your password immediately.'
            });
        }
        
        // REGULAR LOGIN - Password required
        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }
        
        console.log(`🔍 Password hash (first 10 chars): ${user.password.substring(0, 10)}`);
        console.log(`🔍 Comparing password...`);
        
        // CRITICAL: Direct bcrypt comparison
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
                customRole: user.customRole,
                permissions: user.permissions,
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
                customRole: user.customRole,
                permissions: user.permissions,
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
 * POST /api/auth/request-unlock
 * Request account unlock (for locked users)
 */
router.post('/request-unlock', async (req, res) => {
    try {
        const { username, message } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }
        
        const user = await User.findOne({ username: username.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (!user.isLocked) {
            return res.status(400).json({ error: 'Account is not locked' });
        }
        
        user.unlockRequestPending = true;
        user.unlockRequestMessage = message || 'Please unlock my account';
        user.unlockRequestedAt = new Date();
        await user.save();
        
        console.log(`🔓 Unlock request submitted by: ${username}`);
        
        res.json({ 
            message: 'Unlock request submitted. An administrator will review your request.' 
        });
    } catch (error) {
        console.error('Error submitting unlock request:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset (authenticated users)
 */
router.post('/request-password-reset', authenticate, async (req, res) => {
    try {
        const { message } = req.body;
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Admin cannot request password reset
        if (user.role === 'admin') {
            return res.status(400).json({ 
                error: 'Administrators cannot request password reset' 
            });
        }
        
        user.passwordResetRequested = true;
        user.passwordResetRequestMessage = message || 'Forgot password';
        user.passwordResetRequestedAt = new Date();
        await user.save();
        
        console.log(`🔒 Password reset requested by: ${user.username}`);
        
        res.json({ 
            message: 'Password reset request submitted. An administrator will approve your request.' 
        });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ error: 'Server error' });
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
 * Change user password (for passwordless login users)
 */
router.patch('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user.id).lean();
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // If passwordless login is enabled, allow changing without current password
        if (user.allowPasswordlessLogin) {
            if (!newPassword) {
                return res.status(400).json({ error: 'New password is required' });
            }
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Update directly to avoid hooks
            await User.collection.updateOne(
                { _id: user._id },
                { 
                    $set: { 
                        password: hashedPassword,
                        allowPasswordlessLogin: false, // Disable passwordless after setting password
                        updatedAt: new Date()
                    }
                }
            );
            
            console.log(`🔒 Password set for passwordless user: ${user.username}`);
            
            return res.json({ message: 'Password set successfully' });
        }
        
        // Regular password change - verify current password
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Current password and new password are required' 
            });
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
