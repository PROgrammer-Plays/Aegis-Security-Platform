// fix-database-name.js - Force Correct Database
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

console.log('🔧 Database Name Fix Tool');
console.log('═══════════════════════════════════════════');
console.log('');

async function fixDatabase() {
    try {
        const MONGODB_URI = process.env.ATLAS_URI;
        
        // Connect to BOTH databases to check
        console.log('1️⃣  Checking BOTH databases...');
        console.log('');
        
        // Check TEST database
        console.log('📊 Checking "test" database...');
        await mongoose.connect(MONGODB_URI, { dbName: 'test' });
        
        const testDb = mongoose.connection.db;
        const testUsers = await testDb.collection('users').find({}).toArray();
        
        console.log(`   Users in "test": ${testUsers.length}`);
        if (testUsers.length > 0) {
            testUsers.forEach(user => {
                console.log(`     - ${user.username} (${user.role})`);
            });
        }
        
        // Test admin password in test database
        const testAdmin = await testDb.collection('users').findOne({ username: 'admin' });
        if (testAdmin) {
            const testWorks = await bcrypt.compare('admin', testAdmin.password);
            console.log(`   Admin password works in "test": ${testWorks ? '✅ YES' : '❌ NO'}`);
        }
        console.log('');
        
        await mongoose.connection.close();
        
        // Check AEGIS_SECURITY database
        console.log('📊 Checking "aegis_security" database...');
        await mongoose.connect(MONGODB_URI, { dbName: 'aegis_security' });
        
        const aegisDb = mongoose.connection.db;
        const aegisUsers = await aegisDb.collection('users').find({}).toArray();
        
        console.log(`   Users in "aegis_security": ${aegisUsers.length}`);
        if (aegisUsers.length > 0) {
            aegisUsers.forEach(user => {
                console.log(`     - ${user.username} (${user.role})`);
            });
        }
        
        // Test admin password in aegis_security database
        const aegisAdmin = await aegisDb.collection('users').findOne({ username: 'admin' });
        if (aegisAdmin) {
            const aegisWorks = await bcrypt.compare('admin', aegisAdmin.password);
            console.log(`   Admin password works in "aegis_security": ${aegisWorks ? '✅ YES' : '❌ NO'}`);
        }
        console.log('');
        
        // Decision
        console.log('2️⃣  Fixing the issue...');
        console.log('');
        
        if (testAdmin && !testWorks && aegisAdmin && aegisWorks) {
            console.log('✅ Found the problem!');
            console.log('   "test" database has broken admin');
            console.log('   "aegis_security" database has working admin');
            console.log('');
            console.log('💡 Solution: Delete broken admin from "test" and copy working admin');
            console.log('');
            
            // Delete broken admin from test
            const testConn = await mongoose.createConnection(MONGODB_URI, { dbName: 'test' }).asPromise();
            await testConn.db.collection('users').deleteOne({ username: 'admin' });
            console.log('   ✅ Deleted broken admin from "test"');
            await testConn.close();
            
            // Copy working admin to test
            const aegisConn = await mongoose.createConnection(MONGODB_URI, { dbName: 'aegis_security' }).asPromise();
            const workingAdmin = await aegisConn.db.collection('users').findOne({ username: 'admin' });
            await aegisConn.close();
            
            const testConn2 = await mongoose.createConnection(MONGODB_URI, { dbName: 'test' }).asPromise();
            await testConn2.db.collection('users').insertOne({
                username: workingAdmin.username,
                password: workingAdmin.password,
                role: workingAdmin.role,
                fullName: workingAdmin.fullName,
                email: workingAdmin.email,
                isActive: true,
                createdBy: 'database-fix-script',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('   ✅ Copied working admin to "test"');
            await testConn2.close();
            
            // Verify
            const verifyConn = await mongoose.createConnection(MONGODB_URI, { dbName: 'test' }).asPromise();
            const verifyAdmin = await verifyConn.db.collection('users').findOne({ username: 'admin' });
            const verifyWorks = await bcrypt.compare('admin', verifyAdmin.password);
            await verifyConn.close();
            
            console.log('   ✅ Verification: Password works in "test": ' + verifyWorks);
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('✅ DATABASE FIXED!');
            console.log('═══════════════════════════════════════════');
            console.log('');
            console.log('Admin password now works in BOTH databases!');
            console.log('');
            
        } else if (!testAdmin && aegisAdmin && aegisWorks) {
            console.log('✅ Found the problem!');
            console.log('   "test" database is EMPTY');
            console.log('   "aegis_security" database has working admin');
            console.log('');
            console.log('💡 Solution: Copy working admin to "test"');
            console.log('');
            
            // Copy working admin to test
            const testConn = await mongoose.createConnection(MONGODB_URI, { dbName: 'test' }).asPromise();
            await testConn.db.collection('users').insertOne({
                username: aegisAdmin.username,
                password: aegisAdmin.password,
                role: aegisAdmin.role,
                fullName: aegisAdmin.fullName,
                email: aegisAdmin.email,
                isActive: true,
                createdBy: 'database-fix-script',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('   ✅ Copied working admin to "test"');
            await testConn.close();
            
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('✅ DATABASE FIXED!');
            console.log('═══════════════════════════════════════════');
            console.log('');
            
        } else {
            console.log('⚠️  Unexpected situation');
            console.log('   Creating fresh admin in BOTH databases...');
            console.log('');
            
            const hashedPassword = await bcrypt.hash('admin', 10);
            const freshAdmin = {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                fullName: 'System Administrator',
                email: 'admin@aegis.local',
                isActive: true,
                createdBy: 'database-fix-script',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Create in test
            const testConn = await mongoose.createConnection(MONGODB_URI, { dbName: 'test' }).asPromise();
            await testConn.db.collection('users').deleteMany({ username: 'admin' });
            await testConn.db.collection('users').insertOne({ ...freshAdmin });
            console.log('   ✅ Created fresh admin in "test"');
            await testConn.close();
            
            // Create in aegis_security
            const aegisConn = await mongoose.createConnection(MONGODB_URI, { dbName: 'aegis_security' }).asPromise();
            await aegisConn.db.collection('users').deleteMany({ username: 'admin' });
            await aegisConn.db.collection('users').insertOne({ ...freshAdmin });
            console.log('   ✅ Created fresh admin in "aegis_security"');
            await aegisConn.close();
            
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('✅ DATABASE FIXED!');
            console.log('═══════════════════════════════════════════');
            console.log('');
        }
        
        await mongoose.connection.close();
        
        console.log('🔄 Next steps:');
        console.log('   1. Restart your backend: Ctrl+C then node server.js');
        console.log('   2. Test login: node test-login-api.js');
        console.log('   3. Should work! ✅');
        console.log('');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixDatabase();
