// utils/logger.js - Logging Utility
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'aegis.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log levels
 */
const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

/**
 * Format log message
 */
const formatLogMessage = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 
        ? JSON.stringify(meta) 
        : '';
    
    return `[${timestamp}] [${level}] ${message} ${metaStr}`;
};

/**
 * Write to log file
 */
const writeToFile = (message) => {
    try {
        fs.appendFileSync(LOG_FILE, message + '\n');
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
};

/**
 * Logger class
 */
class Logger {
    debug(message, meta) {
        const formatted = formatLogMessage(LogLevel.DEBUG, message, meta);
        console.log(formatted);
        writeToFile(formatted);
    }
    
    info(message, meta) {
        const formatted = formatLogMessage(LogLevel.INFO, message, meta);
        console.log(formatted);
        writeToFile(formatted);
    }
    
    warn(message, meta) {
        const formatted = formatLogMessage(LogLevel.WARN, message, meta);
        console.warn(formatted);
        writeToFile(formatted);
    }
    
    error(message, meta) {
        const formatted = formatLogMessage(LogLevel.ERROR, message, meta);
        console.error(formatted);
        writeToFile(formatted);
    }
}

module.exports = new Logger();
