// routes/admin.routes.js - COMPLETE with Master Reset Feature
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

/**
 * Verify admin middleware
 */
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * GET /api/admin/users
 */
router.get('/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/users
 */
router.post('/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { username, password, role, fullName, email, assigned_ip, assigned_host } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = new User({
            username: username.toLowerCase(),
            password,
            role: role || 'employee',
            fullName: fullName || '',
            email: email || '',
            assigned_ip: assigned_ip || null,
            assigned_host: assigned_host || null,
            createdBy: req.user.username
        });

        await user.save();
        console.log(`✅ User created: ${username} by ${req.user.username}`);

        res.json({ 
            message: 'User created successfully',
            user: { id: user._id, username: user.username, role: user.role }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/admin/users/:userId
 */
router.patch('/users/:userId', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { password, role, fullName, email, assigned_ip, assigned_host } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (role) user.role = role;
        if (fullName !== undefined) user.fullName = fullName;
        if (email !== undefined) user.email = email;
        if (assigned_ip !== undefined) user.assigned_ip = assigned_ip;
        if (assigned_host !== undefined) user.assigned_host = assigned_host;

        if (password && password.length > 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();
        console.log(`✅ User updated: ${user.username} by ${req.user.username}`);
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/admin/users/:userId
 */
router.delete('/users/:userId', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await User.findByIdAndDelete(userId);
        console.log(`✅ User deleted: ${user.username} by ${req.user.username}`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/users/:userId/lock
 */
router.post('/users/:userId/lock', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Reason required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ error: 'Cannot lock your own account' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ error: 'Cannot lock admin accounts' });
        }

        user.isLocked = true;
        user.lockReason = reason;
        user.lockedAt = new Date();
        await user.save();

        console.log(`🔒 Locked: ${user.username} by ${req.user.username}`);
        res.json({ message: 'Account locked successfully' });
    } catch (error) {
        console.error('Error locking user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/users/:userId/unlock
 */
router.post('/users/:userId/unlock', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.isLocked) {
            return res.status(400).json({ error: 'Account is not locked' });
        }

        user.isLocked = false;
        user.lockReason = null;
        user.lockedAt = null;
        await user.save();

        console.log(`🔓 Unlocked: ${user.username} by ${req.user.username}`);
        res.json({ message: 'Account unlocked successfully' });
    } catch (error) {
        console.error('Error unlocking user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/generate-temp-password/:userId
 */
router.post('/generate-temp-password/:userId', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
        const tempHash = await bcrypt.hash(tempPassword, 10);

        user.temporaryPassword = {
            hash: tempHash,
            expiresAt: new Date(Date.now() + 86400000),
            mustChange: true,
            reason: 'temporary'
        };
        await user.save();

        console.log(`🔑 Temp password for: ${user.username}`);
        res.json({ 
            message: 'Temporary password generated',
            tempPassword,
            expiresAt: user.temporaryPassword.expiresAt
        });
    } catch (error) {
        console.error('Error generating temp password:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/master-reset-passwords
 * MASTER RESET - Reset ALL non-admin passwords - NEW!
 */
router.post('/master-reset-passwords', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { confirmationCode } = req.body;
        
        if (confirmationCode !== 'RESET_ALL_USERS') {
            return res.status(400).json({ error: 'Invalid confirmation code' });
        }
        
        const users = await User.find({ 
            role: { $ne: 'admin' },
            _id: { $ne: req.user.id }
        });
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'No users to reset' });
        }
        
        let resetCount = 0;
        
        for (const user of users) {
            user.temporaryPassword = {
                hash: user.password,  // Current password becomes temporary
                expiresAt: new Date(Date.now() + 86400000),
                mustChange: true,
                reason: 'master_reset'
            };
            
            await user.save();
            resetCount++;
        }
        
        console.log(`🚨 MASTER RESET by ${req.user.username}: ${resetCount} users`);
        
        res.json({
            message: `${resetCount} users reset successfully`,
            affectedUsers: resetCount,
            note: 'Users must change password on next login using old password as temporary'
        });
    } catch (error) {
        console.error('Master reset error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/admin/stats
 */
router.get('/stats', authenticate, verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const lockedUsers = await User.countDocuments({ isLocked: true });
        
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        res.json({ totalUsers, activeUsers, lockedUsers, usersByRole });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;