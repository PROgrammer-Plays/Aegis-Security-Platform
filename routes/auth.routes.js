// routes/auth.routes.js - COMPLETE with Password System Support
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * POST /api/auth/login
 * Login with support for temporary passwords and force password change
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log(`🔑 Login attempt: ${username}`);
        
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }
        
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
                message: 'Your account has been locked. Please contact an administrator.'
            });
        }
        
        // Check if account is active
        if (!user.isActive) {
            console.log(`❌ Account disabled: ${username}`);
            return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
        }
        
        // TEMPORARY PASSWORD CHECK - NEW!
        let isTemporaryPassword = false;
        let passwordChangeReason = null;
        
        if (user.temporaryPassword?.hash) {
            // Check if temp password expired
            if (Date.now() > new Date(user.temporaryPassword.expiresAt).getTime()) {
                // Expired - clear it
                await User.collection.updateOne(
                    { _id: user._id },
                    { $unset: { temporaryPassword: '' } }
                );
            } else {
                // Try temp password
                const validTemp = await bcrypt.compare(password, user.temporaryPassword.hash);
                if (validTemp) {
                    isTemporaryPassword = true;
                    passwordChangeReason = user.temporaryPassword.reason || 'temporary';
                    console.log(`🔑 Temporary password used for: ${username} (Reason: ${passwordChangeReason})`);
                }
            }
        }
        
        // Regular password check
        if (!isTemporaryPassword) {
            if (!password) {
                return res.status(400).json({ error: 'Password required' });
            }
            
            const validPassword = await bcrypt.compare(password, user.password);
            
            if (!validPassword) {
                console.log(`❌ Invalid password for: ${username}`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        
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
        
        console.log(`✅ Login successful: ${user.username} (${user.role})`);
        
        // Return with mustChangePassword flag
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
            },
            mustChangePassword: isTemporaryPassword,  // NEW!
            passwordChangeReason: passwordChangeReason  // NEW!
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset via email (public route)
 */
router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        // Always return success (don't reveal if email exists - security best practice)
        if (!user) {
            console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
            return res.json({ 
                message: 'If an account exists with that email, a reset link has been sent.' 
            });
        }
        
        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        
        // Save to database (expires in 1 hour)
        user.passwordReset = {
            token: resetTokenHash,
            expires: new Date(Date.now() + 3600000), // 1 hour
            requestedAt: new Date()
        };
        await user.save();
        
        console.log(`📧 Password reset token generated for: ${user.username}`);
        
        // DEV MODE: Log token (in production, send email!)
        console.log(`
        =====================================================
        PASSWORD RESET TOKEN (DEV MODE)
        User: ${user.username}
        Reset URL: http://localhost:3000/reset-password/${resetToken}
        Expires: ${new Date(Date.now() + 3600000).toLocaleString()}
        =====================================================
        `);
        
        res.json({ 
            message: 'If an account exists with that email, a reset link has been sent.',
            // DEV MODE ONLY
            devMode: {
                resetToken,
                resetUrl: `http://localhost:3000/reset-password/${resetToken}`
            }
        });
    } catch (error) {
        console.error('❌ Request reset error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password required' });
        }
        
        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        // Hash the token from URL
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        
        // Find user with valid token
        const user = await User.findOne({
            'passwordReset.token': resetTokenHash,
            'passwordReset.expires': { $gt: new Date() }
        });
        
        if (!user) {
            console.log(`❌ Invalid or expired token`);
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        
        console.log(`🔒 Resetting password for: ${user.username}`);
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and clear reset token
        await User.collection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    password: hashedPassword,
                    updatedAt: new Date()
                },
                $unset: { 
                    passwordReset: '',
                    temporaryPassword: '' // Clear temp password if exists
                }
            }
        );
        
        console.log(`✅ Password reset successful for: ${user.username}`);
        
        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/change-password
 * Change password (authenticated users) - UPDATED!
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Current password and new password required' 
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        const user = await User.findById(req.user.id).lean();
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if using temporary password
        let isUsingTempPassword = false;
        
        if (user.temporaryPassword?.hash) {
            const validTemp = await bcrypt.compare(currentPassword, user.temporaryPassword.hash);
            if (validTemp) {
                isUsingTempPassword = true;
                console.log(`🔑 User changing from temporary password: ${user.username}`);
            }
        }
        
        // Verify current password (if not using temp)
        if (!isUsingTempPassword) {
            const validPassword = await bcrypt.compare(currentPassword, user.password);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and clear temp password
        await User.collection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    password: hashedPassword, 
                    updatedAt: new Date() 
                },
                $unset: { temporaryPassword: '' } // Clear temp password
            }
        );
        
        console.log(`🔒 Password changed successfully for: ${user.username}`);
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('❌ Change password error:', error);
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

module.exports = router;