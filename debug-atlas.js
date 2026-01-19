// debug-atlas-login.js - Debug Login Issue with Atlas
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.ATLAS_URI;

console.log('🔍 MongoDB Atlas Login Debug Tool');
console.log('═══════════════════════════════════════════');
console.log('');

async function debugLogin() {
    try {
        console.log('1️⃣  Checking environment...');
        console.log('   ATLAS_URI exists:', !!MONGODB_URI);
        console.log('   ATLAS_URI format:', MONGODB_URI ? MONGODB_URI.substring(0, 20) + '...' : 'Missing');
        console.log('   JWT_SECRET exists:', !!process.env.JWT_SECRET);
        console.log('');
        
        console.log('2️⃣  Connecting to Atlas...');
        await mongoose.connect(MONGODB_URI, {
            dbName: 'aegis_security'
        });
        console.log('   ✅ Connected');
        console.log('   Database:', mongoose.connection.name);
        console.log('');
        
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        console.log('3️⃣  Checking users collection...');
        const userCount = await usersCollection.countDocuments();
        console.log('   Total users:', userCount);
        
        const allUsers = await usersCollection.find({}).toArray();
        console.log('   Users:');
        allUsers.forEach(user => {
            console.log(`     - ${user.username} (${user.role}) - Active: ${user.isActive}`);
        });
        console.log('');
        
        console.log('4️⃣  Finding admin user...');
        const admin = await usersCollection.findOne({ username: 'admin' });
        
        if (!admin) {
            console.log('   ❌ Admin user not found!');
            console.log('');
            console.log('   Run this to create admin:');
            console.log('   node reset-admin-atlas.js');
            await mongoose.connection.close();
            process.exit(1);
        }
        
        console.log('   ✅ Admin found');
        console.log('   ID:', admin._id);
        console.log('   Username:', admin.username);
        console.log('   Role:', admin.role);
        console.log('   Active:', admin.isActive);
        console.log('   Email:', admin.email || 'Not set');
        console.log('   Password hash (first 30 chars):', admin.password.substring(0, 30) + '...');
        console.log('');
        
        console.log('5️⃣  Testing password with bcrypt...');
        
        // Test common passwords
        const testPasswords = ['admin', 'Admin', 'ADMIN', 'password', ''];
        
        for (const testPwd of testPasswords) {
            const result = await bcrypt.compare(testPwd, admin.password);
            console.log(`   Password "${testPwd}":`, result ? '✅ WORKS' : '❌ No match');
        }
        console.log('');
        
        console.log('6️⃣  Checking password hash format...');
        const hashFormat = admin.password.substring(0, 4);
        console.log('   Hash starts with:', hashFormat);
        
        if (hashFormat === '$2b$' || hashFormat === '$2a$') {
            console.log('   ✅ Valid bcrypt hash format');
        } else {
            console.log('   ❌ INVALID hash format!');
            console.log('   Expected: $2b$ or $2a$');
            console.log('   Got:', hashFormat);
        }
        console.log('');
        
        console.log('7️⃣  Checking for double hashing...');
        const passwordLength = admin.password.length;
        console.log('   Password hash length:', passwordLength);
        
        if (passwordLength === 60) {
            console.log('   ✅ Normal bcrypt length (60 chars)');
        } else if (passwordLength > 60) {
            console.log('   ⚠️  Hash is too long - might be double hashed!');
        }
        console.log('');
        
        console.log('8️⃣  Simulating login attempt...');
        const loginPassword = 'admin';
        console.log('   Attempting to login with password:', loginPassword);
        
        const isValid = await bcrypt.compare(loginPassword, admin.password);
        
        if (isValid) {
            console.log('   ✅ LOGIN WOULD SUCCEED');
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('✅ PASSWORD IS CORRECT');
            console.log('═══════════════════════════════════════════');
            console.log('');
            console.log('The password "admin" works in the database.');
            console.log('');
            console.log('If login still fails in your app, check:');
            console.log('');
            console.log('1. Frontend is sending correct format:');
            console.log('   { username: "admin", password: "admin" }');
            console.log('');
            console.log('2. Backend auth route:');
            console.log('   Check routes/auth.routes.js');
            console.log('   Ensure bcrypt.compare() is used correctly');
            console.log('');
            console.log('3. Network/CORS:');
            console.log('   Open browser console (F12)');
            console.log('   Check for CORS or network errors');
            console.log('');
            console.log('4. JWT Secret:');
            console.log('   Ensure JWT_SECRET is set in .env');
            console.log('');
        } else {
            console.log('   ❌ LOGIN WOULD FAIL');
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('❌ PASSWORD IS INCORRECT IN DATABASE');
            console.log('═══════════════════════════════════════════');
            console.log('');
            console.log('The password is wrong. Run this to fix:');
            console.log('   node reset-admin-atlas.js');
            console.log('');
        }
        
        console.log('9️⃣  Checking User model...');
        console.log('   Looking for pre-save hooks...');
        
        const User = require('./models/User');
        const userSchema = User.schema;
        
        if (userSchema.s && userSchema.s.hooks) {
            const preSaveHooks = userSchema.s.hooks._pres?.get('save') || [];
            console.log('   Pre-save hooks found:', preSaveHooks.length);
            
            if (preSaveHooks.length > 0) {
                console.log('   ⚠️  WARNING: Pre-save hooks exist');
                console.log('   This might cause double hashing!');
                console.log('   Check models/User.js');
            } else {
                console.log('   ✅ No problematic hooks');
            }
        }
        console.log('');
        
        console.log('🔟 Final recommendation...');
        console.log('');
        
        if (isValid) {
            console.log('✅ Database password is CORRECT');
            console.log('');
            console.log('Next steps:');
            console.log('1. Check browser console (F12) for errors');
            console.log('2. Check backend logs when you try to login');
            console.log('3. Ensure frontend sends: {"username":"admin","password":"admin"}');
            console.log('4. Check CORS: backend should show OPTIONS /api/auth/login');
        } else {
            console.log('❌ Database password is WRONG');
            console.log('');
            console.log('Fix it by running:');
            console.log('   node reset-admin-atlas.js');
        }
        
        await mongoose.connection.close();
        console.log('');
        console.log('🔌 Disconnected from Atlas');
        console.log('');
        
    } catch (error) {
        console.error('');
        console.error('❌ Error:', error.message);
        console.error('');
        process.exit(1);
    }
}

debugLogin();