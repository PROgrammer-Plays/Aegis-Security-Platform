// services/socket.service.js - WebSocket Service
const { Server } = require('socket.io');
const { CORS_ORIGIN } = require('../config/constants');

let io = null;

/**
 * Initialize Socket.IO server
 */
const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: CORS_ORIGIN,
            methods: ["GET", "POST", "PATCH", "DELETE"]
        }
    });
    
    // Connection event
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        console.log(`👥 Total clients: ${io.engine.clientsCount}`);
        
        // Disconnection event
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            console.log(`👥 Total clients: ${io.engine.clientsCount}`);
        });
    });
    
    console.log('📡 WebSocket server initialized');
    return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket() first.');
    }
    return io;
};

/**
 * Broadcast new alert to all clients
 */
const broadcastNewAlert = (alert) => {
    if (!io) {
        console.warn('⚠️  Socket.IO not initialized, cannot broadcast alert');
        return;
    }
    
    io.emit('new-alert', alert);
    console.log(`📡 Broadcasted new alert to ${io.engine.clientsCount} client(s)`);
};

/**
 * Broadcast alert update to all clients
 */
const broadcastAlertUpdate = (alert) => {
    if (!io) {
        console.warn('⚠️  Socket.IO not initialized, cannot broadcast update');
        return;
    }
    
    io.emit('alert-updated', alert);
    console.log(`📡 Broadcasted alert update to ${io.engine.clientsCount} client(s)`);
};

/**
 * Send notification to specific user (future feature)
 */
const sendNotification = (userId, notification) => {
    if (!io) {
        console.warn('⚠️  Socket.IO not initialized');
        return;
    }
    
    io.to(userId).emit('notification', notification);
};

module.exports = {
    initializeSocket,
    getIO,
    broadcastNewAlert,
    broadcastAlertUpdate,
    sendNotification
};
