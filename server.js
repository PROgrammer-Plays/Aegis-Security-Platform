// server.js - AEGIS Security Backend (Modular Architecture)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

// Configuration
const { PORT, CORS_ORIGIN } = require('./config/constants');
const { connectDatabase, setupDatabaseEvents, closeDatabase } = require('./config/database');

// Services
const { initializeSocket } = require('./services/socket.service');
const { createDefaultAdmin } = require('./services/admin.service');

// Routes
const authRoutes = require('./routes/auth.routes');
const alertsRoutes = require('./routes/alerts.routes');
const statsRoutes = require('./routes/stats.routes');
const adminRoutes = require('./routes/admin.routes');

// ===== EXPRESS SETUP =====
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'AEGIS Backend is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message
    });
});

// ===== INITIALIZATION =====
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();
        setupDatabaseEvents();
        
        // Create default admin
        await createDefaultAdmin();
        
        // Initialize WebSocket
        initializeSocket(server);
        
        // Start server
        server.listen(PORT, () => {
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('🛡️  AEGIS Security Backend');
            console.log('═══════════════════════════════════════════');
            console.log(`🚀 Server running on port: ${PORT}`);
            console.log(`🌐 API: http://localhost:${PORT}`);
            console.log(`📡 WebSocket ready`);
            console.log(`🔒 CORS origin: ${CORS_ORIGIN}`);
            console.log('═══════════════════════════════════════════');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// ===== GRACEFUL SHUTDOWN =====
const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    server.close(async () => {
        console.log('✅ HTTP server closed');
        await closeDatabase();
        console.log('✅ Database connection closed');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('⚠️  Forced shutdown');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
});

// Start the server
startServer();
