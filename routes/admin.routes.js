// routes/admin.routes.js - Enhanced Admin Routes with All New Features
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const CustomRole = require('../models/CustomRole');
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
 * Create new user with custom role support (Admin only)
 */
router.post('/users', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { 
            username, 
            password, 
            role, 
            customRole,
            fullName, 
            email, 
            assigned_ip, 
            assigned_host,
            permissions
        } = req.body;
        
        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
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
        const userData = {
            username: username.toLowerCase(),
            password: hashedPassword,
            role: role || 'employee',
            fullName,
            email,
            assigned_ip,
            assigned_host,
            isActive: true,
            createdBy: req.user.username
        };
        
        // If custom role, add custom role name and permissions
        if (role === 'custom' && customRole) {
            userData.customRole = customRole;
            // Fetch custom role permissions
            const roleData = await CustomRole.findOne({ name: customRole });
            if (roleData) {
                userData.permissions = roleData.permissions;
            }
        } else if (permissions) {
            // Manual permission override
            userData.permissions = permissions;
        }
        
        const user = new User(userData);
        await user.save();
        
        console.log(`👤 User created: ${user.username} (${user.role}${user.customRole ? ` - ${user.customRole}` : ''}) by ${req.user.username}`);
        
        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({ 
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Server error creating user' });
    }
});

/**
 * PATCH /api/admin/users/:id
 * Update user including role changes (Admin only)
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
        
        // If changing to custom role, update permissions
        if (updates.role === 'custom' && updates.customRole) {
            const roleData = await CustomRole.findOne({ name: updates.customRole });
            if (roleData) {
                updates.permissions = roleData.permissions;
            }
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
 * PATCH /api/admin/users/:id/lock
 * Lock user account (Admin only)
 */
router.patch('/users/:id/lock', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        // Prevent locking yourself
        if (id === req.user.id) {
            return res.status(400).json({ 
                error: 'Cannot lock your own account' 
            });
        }
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.isLocked = true;
        user.lockReason = reason || 'Account locked by administrator';
        user.lockedAt = new Date();
        await user.save();
        
        console.log(`🔒 User locked: ${user.username} by ${req.user.username}`);
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({ 
            message: 'User account locked successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error locking user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/admin/users/:id/unlock
 * Unlock user account (Admin only)
 */
router.patch('/users/:id/unlock', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.isLocked = false;
        user.lockReason = null;
        user.lockedAt = null;
        user.unlockRequestPending = false;
        user.unlockRequestMessage = null;
        user.unlockRequestedAt = null;
        await user.save();
        
        console.log(`🔓 User unlocked: ${user.username} by ${req.user.username}`);
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({ 
            message: 'User account unlocked successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error unlocking user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/admin/unlock-requests
 * Get all pending unlock requests (Admin only)
 */
router.get('/unlock-requests', authenticate, verifyAdmin, async (req, res) => {
    try {
        const requests = await User.find({ 
            unlockRequestPending: true 
        }, '-password').sort({ unlockRequestedAt: -1 });
        
        console.log(`📋 Admin ${req.user.username} fetched ${requests.length} unlock requests`);
        
        res.json({ requests });
    } catch (error) {
        console.error('Error fetching unlock requests:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/admin/password-reset-requests
 * Get all pending password reset requests (Admin only)
 */
router.get('/password-reset-requests', authenticate, verifyAdmin, async (req, res) => {
    try {
        const requests = await User.find({ 
            passwordResetRequested: true 
        }, '-password').sort({ passwordResetRequestedAt: -1 });
        
        console.log(`📋 Admin ${req.user.username} fetched ${requests.length} password reset requests`);
        
        res.json({ requests });
    } catch (error) {
        console.error('Error fetching password reset requests:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/admin/users/:id/approve-password-reset
 * Approve password reset (enable passwordless login) (Admin only)
 */
router.patch('/users/:id/approve-password-reset', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.allowPasswordlessLogin = true;
        user.passwordResetRequested = false;
        user.passwordResetRequestMessage = null;
        user.passwordResetRequestedAt = null;
        await user.save();
        
        console.log(`✅ Password reset approved for: ${user.username} by ${req.user.username}`);
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({ 
            message: 'Password reset approved. User can now login without password.',
            user: userResponse
        });
    } catch (error) {
        console.error('Error approving password reset:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/admin/users/:id/reset-password
 * Admin resets user password (Admin only)
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
        user.allowPasswordlessLogin = false;
        user.passwordResetRequested = false;
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

// ===== CUSTOM ROLES MANAGEMENT =====

/**
 * GET /api/admin/custom-roles
 * Get all custom roles (Admin only)
 */
router.get('/custom-roles', authenticate, verifyAdmin, async (req, res) => {
    try {
        const roles = await CustomRole.find().sort({ createdAt: -1 });
        
        console.log(`📋 Admin ${req.user.username} fetched ${roles.length} custom roles`);
        
        res.json({ roles });
    } catch (error) {
        console.error('Error fetching custom roles:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/custom-roles
 * Create new custom role (Admin only)
 */
router.post('/custom-roles', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { name, displayName, description, permissions } = req.body;
        
        if (!name || !displayName) {
            return res.status(400).json({ 
                error: 'Role name and display name are required' 
            });
        }
        
        // Check if role exists
        const existingRole = await CustomRole.findOne({ name: name.toLowerCase() });
        if (existingRole) {
            return res.status(400).json({ 
                error: 'Role with this name already exists' 
            });
        }
        
        const role = new CustomRole({
            name: name.toLowerCase(),
            displayName,
            description,
            permissions,
            createdBy: req.user.username
        });
        
        await role.save();
        
        console.log(`✨ Custom role created: ${role.name} by ${req.user.username}`);
        
        res.json({ 
            message: 'Custom role created successfully',
            role
        });
    } catch (error) {
        console.error('Error creating custom role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/admin/custom-roles/:id
 * Update custom role (Admin only)
 */
router.patch('/custom-roles/:id', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const role = await CustomRole.findByIdAndUpdate(
            id,
            updates,
            { new: true }
        );
        
        if (!role) {
            return res.status(404).json({ error: 'Custom role not found' });
        }
        
        // Update all users with this custom role
        await User.updateMany(
            { customRole: role.name },
            { $set: { permissions: role.permissions } }
        );
        
        console.log(`✨ Custom role updated: ${role.name} by ${req.user.username}`);
        
        res.json({ 
            message: 'Custom role updated successfully',
            role
        });
    } catch (error) {
        console.error('Error updating custom role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/admin/custom-roles/:id
 * Delete custom role (Admin only)
 */
router.delete('/custom-roles/:id', authenticate, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const role = await CustomRole.findByIdAndDelete(id);
        
        if (!role) {
            return res.status(404).json({ error: 'Custom role not found' });
        }
        
        // Update users with this role to default 'employee'
        await User.updateMany(
            { customRole: role.name },
            { 
                $set: { 
                    role: 'employee',
                    customRole: null
                }
            }
        );
        
        console.log(`✨ Custom role deleted: ${role.name} by ${req.user.username}`);
        
        res.json({ message: 'Custom role deleted successfully' });
    } catch (error) {
        console.error('Error deleting custom role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
