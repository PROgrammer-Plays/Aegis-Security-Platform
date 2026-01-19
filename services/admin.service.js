// services/admin.service.js - FIXED Admin User Creation Service
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { DEFAULT_ADMIN } = require('../config/constants');

/**
 * Create default admin user if doesn't exist
 * IMPORTANT: We manually hash the password to avoid double-hashing from User model's pre-save hook
 */
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: DEFAULT_ADMIN.username });
        
        if (adminExists) {
            console.log('👑 Admin user already exists');
            
            // OPTIONAL: Test if password works
            const testPassword = await bcrypt.compare(DEFAULT_ADMIN.password, adminExists.password);
            if (!testPassword) {
                console.log('⚠️  Admin password might be incorrect. Use resetAdminPassword() to fix.');
            }
            
            return null;
        }
        
        // Hash password ONCE (10 rounds)
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
        
        // Create admin user - use insertOne to bypass mongoose middleware
        const adminDoc = {
            username: DEFAULT_ADMIN.username,
            password: hashedPassword, // Already hashed
            role: DEFAULT_ADMIN.role,
            fullName: DEFAULT_ADMIN.fullName,
            email: DEFAULT_ADMIN.email,
            isActive: true,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Insert directly to avoid pre-save hook
        await User.collection.insertOne(adminDoc);
        
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('👑 DEFAULT ADMIN CREATED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════');
        console.log(`Username: ${DEFAULT_ADMIN.username}`);
        console.log(`Password: ${DEFAULT_ADMIN.password}`);
        console.log('═══════════════════════════════════════════');
        console.log('⚠️  Change password after first login!');
        console.log('');
        
        return adminDoc;
    } catch (error) {
        console.error('❌ Error creating default admin:', error.message);
        throw error;
    }
};

/**
 * Reset admin password to default
 * This fixes any password issues
 */
const resetAdminPassword = async () => {
    try {
        const admin = await User.findOne({ username: DEFAULT_ADMIN.username });
        
        if (!admin) {
            throw new Error('Admin user not found');
        }
        
        // Hash password directly
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
        
        // Update directly in database to bypass pre-save hook
        await User.collection.updateOne(
            { username: DEFAULT_ADMIN.username },
            { 
                $set: { 
                    password: hashedPassword,
                    isActive: true,
                    updatedAt: new Date()
                }
            }
        );
        
        console.log('');
        console.log('✅ Admin password reset successfully');
        console.log(`Username: ${DEFAULT_ADMIN.username}`);
        console.log(`Password: ${DEFAULT_ADMIN.password}`);
        console.log('');
        
        return admin;
    } catch (error) {
        console.error('❌ Error resetting admin password:', error.message);
        throw error;
    }
};

/**
 * Delete admin user (for testing)
 */
const deleteAdmin = async () => {
    try {
        await User.deleteOne({ username: DEFAULT_ADMIN.username });
        console.log('✅ Admin user deleted');
    } catch (error) {
        console.error('❌ Error deleting admin:', error.message);
        throw error;
    }
};

module.exports = {
    createDefaultAdmin,
    resetAdminPassword,
    deleteAdmin
};