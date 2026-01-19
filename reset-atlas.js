// reset-admin-atlas.js - Password Reset for MongoDB Atlas
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Get MongoDB URI from environment
const MONGODB_URI = process.env.ATLAS_URI;

if (!MONGODB_URI) {
    console.error('❌ ATLAS_URI not found in .env file');
    console.log('Add this to your .env file:');
    console.log('ATLAS_URI=mongodb+srv://username:password@cluster0.mihkivt.mongodb.net/aegis_security');
    process.exit(1);
}

console.log('🔧 MongoDB Atlas Password Reset Tool');
console.log('═══════════════════════════════════════════');
console.log('');

async function resetAdminPassword() {
    try {
        console.log('🌐 Connecting to MongoDB Atlas...');
        console.log(`📍 Cluster: ${MONGODB_URI.split('@')[1]?.split('/')[0] || 'Unknown'}`);
        
        await mongoose.connect(MONGODB_URI, {
            dbName: 'aegis_security' // Force database name
        });
        
        console.log('✅ Connected to Atlas');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log('');
        
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Count users
        const userCount = await usersCollection.countDocuments();
        console.log(`👥 Total users in database: ${userCount}`);
        console.log('');
        
        // Find admin
        console.log('🔍 Searching for admin user...');
        const admin = await usersCollection.findOne({ username: 'admin' });
        
        if (!admin) {
            console.log('❌ Admin user NOT found in Atlas database');
            console.log('');
            console.log('Creating new admin user...');
            
            const hashedPassword = await bcrypt.hash('admin', 10);
            
            const newAdmin = {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@aegis.local',
                isActive: true,
                createdBy: 'atlas-reset-script',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await usersCollection.insertOne(newAdmin);
            console.log('✅ Admin user created in Atlas');
            console.log(`📝 User ID: ${result.insertedId}`);
        } else {
            console.log('✅ Admin user found');
            console.log(`📝 User ID: ${admin._id}`);
            console.log(`📧 Email: ${admin.email || 'Not set'}`);
            console.log(`🎭 Role: ${admin.role}`);
            console.log(`📅 Created: ${admin.createdAt || 'Unknown'}`);
            console.log('');
            
            // Check current password
            console.log('🧪 Testing current password...');
            const currentPasswordWorks = await bcrypt.compare('admin', admin.password);
            
            if (currentPasswordWorks) {
                console.log('✅ Current password already works!');
                console.log('');
                console.log('═══════════════════════════════════════════');
                console.log('👑 PASSWORD IS CORRECT');
                console.log('═══════════════════════════════════════════');
                console.log('Username: admin');
                console.log('Password: admin');
                console.log('═══════════════════════════════════════════');
                console.log('');
                console.log('⚠️  The issue might be elsewhere:');
                console.log('1. Check if frontend is sending correct data');
                console.log('2. Check CORS settings');
                console.log('3. Check JWT_SECRET in .env');
                console.log('4. Check browser console for errors');
                console.log('');
                
                await mongoose.connection.close();
                process.exit(0);
            }
            
            console.log('❌ Current password does NOT work');
            console.log('🔒 Resetting password in Atlas...');
            
            // Delete old admin and create new one (ensures clean state)
            await usersCollection.deleteOne({ username: 'admin' });
            console.log('🗑️  Old admin deleted');
            
            const hashedPassword = await bcrypt.hash('admin', 10);
            
            const newAdmin = {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@aegis.local',
                isActive: true,
                createdBy: 'atlas-reset-script',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            await usersCollection.insertOne(newAdmin);
            console.log('✅ New admin created in Atlas');
        }
        
        // Final test
        console.log('');
        console.log('🧪 Final password test...');
        const finalAdmin = await usersCollection.findOne({ username: 'admin' });
        const isValid = await bcrypt.compare('admin', finalAdmin.password);
        
        if (isValid) {
            console.log('✅ Password test: SUCCESS ✓');
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('👑 ADMIN CREDENTIALS (ATLAS)');
            console.log('═══════════════════════════════════════════');
            console.log('Username: admin');
            console.log('Password: admin');
            console.log('Database: aegis_security');
            console.log(`Cluster: ${MONGODB_URI.split('@')[1]?.split('/')[0]}`);
            console.log('═══════════════════════════════════════════');
            console.log('');
            console.log('✅ You can now login at http://localhost:3000');
            console.log('');
            console.log('🔄 IMPORTANT: Restart your backend server!');
            console.log('   Ctrl+C to stop');
            console.log('   node server.js to start');
            console.log('');
        } else {
            console.log('❌ Password test: FAILED ✗');
            console.log('');
            console.log('Something is wrong with bcrypt hashing');
            console.log('Password hash in DB:', finalAdmin.password.substring(0, 20) + '...');
            console.log('');
            console.log('Try these debugging steps:');
            console.log('1. Check bcrypt version: npm list bcrypt');
            console.log('2. Reinstall bcrypt: npm uninstall bcrypt && npm install bcrypt');
            console.log('3. Check Node version: node --version (need 14+)');
        }
        
        await mongoose.connection.close();
        console.log('');
        console.log('🔌 Disconnected from Atlas');
        process.exit(0);
        
    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════');
        console.error('❌ ERROR');
        console.error('═══════════════════════════════════════════');
        console.error('Message:', error.message);
        console.error('');
        
        if (error.message.includes('authentication failed')) {
            console.error('🔐 Authentication Error:');
            console.error('   Check your Atlas username and password in ATLAS_URI');
            console.error('   Format: mongodb+srv://USERNAME:PASSWORD@cluster...');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('🌐 Network Error:');
            console.error('   Cannot reach MongoDB Atlas');
            console.error('   Check your internet connection');
        } else if (error.message.includes('IP')) {
            console.error('🔒 IP Whitelist Error:');
            console.error('   Your IP is not whitelisted in Atlas');
            console.error('   Go to Atlas → Network Access → Add IP Address');
            console.error('   Add: 0.0.0.0/0 (for testing) or your current IP');
        }
        
        console.error('');
        process.exit(1);
    }
}

resetAdminPassword();