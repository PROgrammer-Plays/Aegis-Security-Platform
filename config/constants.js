// config/constants.js - Environment Variables & Configuration
require('dotenv').config();

module.exports = {
    // Server Configuration
    PORT: process.env.BackEnd_PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database Configuration
    MONGODB_URI: process.env.ATLAS_URI || 'mongodb://localhost:27017/aegis_security',
    
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'aegis_super_secret_key_change_in_production',
    JWT_EXPIRES_IN: '8h',
    
    // CORS Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    
    // Default Admin Credentials
    DEFAULT_ADMIN: {
        username: 'admin',
        password: 'admin',
        role: 'admin',
        fullName: 'System Administrator',
        email: 'admin@aegis.local'
    }
};
