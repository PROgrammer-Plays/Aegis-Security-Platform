// routes/admin.routes.js - Admin User Management Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/rbac');

/**
 * GET /api/admin/users
 * Get all users (Admin only)
 */
router.get('/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password')
            .sort({ createdAt: -1 });
        
        console.log(`📋 Admin ${req.user.username} fetched ${users.length} users`);
        
        res.json({ 
            users, 
            total: users.length 
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error fetching users' });
    }
});

/**
 * POST /api/admin/users
 * Create new user (Admin only)
 */
router.post('/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { 
            username, 
            password, 
            role, 
            fullName, 
            email, 
            assigned_ip, 
            assigned_host 
        } = req.body;
        
        // Validate required fields
        if (!username || !password || !role) {
            return res.status(400).json({ 
                error: 'Username, password, and role are required' 
            });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ 
            username: username.toLowerCase() 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                error: 'Username already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            username: username.toLowerCase(),
            password: hashedPassword,
            role,
            fullName,
            email,
            assigned_ip,
            assigned_host,
            isActive: true,
            createdBy: req.user.username
        });
        
        await user.save();
        
        console.log(`👤 User created: ${user.username} (${user.role}) by ${req.user.username}`);
        
        res.json({ 
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                assigned_ip: user.assigned_ip
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Server error creating user' });
    }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (Admin only)
 */
router.patch('/users/:id', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Don't allow password updates through this route
        delete updates.password;
        
        // Don't allow changing your own role
        if (id === req.user.id && updates.role) {
            return res.status(400).json({ 
                error: 'Cannot change your own role' 
            });
        }
        
        const user = await User.findByIdAndUpdate(
            id,
            updates,
            { new: true, select: '-password' }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`👤 User updated: ${user.username} by ${req.user.username}`);
        
        res.json({ 
            message: 'User updated successfully', 
            user 
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error updating user' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user (Admin only)
 */
router.delete('/users/:id', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ 
                error: 'Cannot delete your own account' 
            });
        }
        
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`👤 User deleted: ${user.username} by ${req.user.username}`);
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error deleting user' });
    }
});

/**
 * PATCH /api/admin/users/:id/reset-password
 * Reset user password (Admin only)
 */
router.patch('/users/:id/reset-password', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({ 
                error: 'New password is required' 
            });
        }
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        
        console.log(`🔒 Password reset for ${user.username} by ${req.user.username}`);
        
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/admin/users/:id/toggle-status
 * Toggle user active status (Admin only)
 */
router.patch('/users/:id/toggle-status', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent disabling yourself
        if (id === req.user.id) {
            return res.status(400).json({ 
                error: 'Cannot disable your own account' 
            });
        }
        
        const user = await User.findById(id, '-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Toggle status
        user.isActive = !user.isActive;
        await user.save();
        
        console.log(`👤 User ${user.username} ${user.isActive ? 'enabled' : 'disabled'} by ${req.user.username}`);
        
        res.json({ 
            message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully`,
            user 
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
