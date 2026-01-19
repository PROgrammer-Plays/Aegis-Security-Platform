// config/database.js - FIXED MongoDB Connection (Force Correct Database)
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./constants');

/**
 * Connect to MongoDB
 * IMPORTANT: Force database name to 'aegis_security'
 */
const connectDatabase = async () => {
    try {
        // CRITICAL: Force dbName to 'aegis_security'
        // This prevents connecting to 'test' database
        await mongoose.connect(MONGODB_URI, {
            dbName: 'aegis_security'  // ← Force this database!
        });
        
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        
        // VERIFY we're in the right database
        if (mongoose.connection.name !== 'aegis_security') {
            console.error('❌ ERROR: Connected to wrong database!');
            console.error(`   Expected: aegis_security`);
            console.error(`   Got: ${mongoose.connection.name}`);
            throw new Error('Wrong database connected');
        }
        
        console.log(`🌐 Host: ${mongoose.connection.host}`);
        
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

/**
 * Handle MongoDB connection events
 */
const setupDatabaseEvents = () => {
    mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
    });
    
    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err);
    });
};

/**
 * Gracefully close database connection
 */
const closeDatabase = async () => {
    try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB:', error);
    }
};

module.exports = {
    connectDatabase,
    setupDatabaseEvents,
    closeDatabase
};
