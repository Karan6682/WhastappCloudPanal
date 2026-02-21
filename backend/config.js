/**
 * Centralized Configuration File
 * All settings in one place
 */

const path = require('path');

module.exports = {
    // Server Configuration
    PORT: 3001,
    HOST: '0.0.0.0',
    
    // API Base URL (for frontend) - no trailing /api
    API_BASE_URL: 'http://localhost:3001',
    
    // Database Configuration (SQLite - Local)
    DATABASE: {
        PATH: path.join(__dirname, '../database.sqlite'),
        NAME: 'database.sqlite'
    },
    
    /*
    // MSSQL Database Configuration (Online SQL Server) - COMMENTED OUT
    MSSQL: {
        server: '160.250.204.51',
        database: 'pathosta_BulkWhatsAppsBusinessDB',
        user: 'pathosta_BulkWhatsAppsBusinessUser',
        password: 'Nbfo9d4A$@fMyka6',
        port: 1433, // MSSQL Server port
        options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    },
    */
    
    // WhatsApp Configuration
    WHATSAPP: {
        SESSIONS_DIR: path.join(__dirname, '../whatsapp-sessions'),
        RECONNECT_INTERVAL: 3000,
        MAX_RETRIES: 5
    },
    
    // Upload Configuration
    UPLOAD: {
        DIR: path.join(__dirname, '../uploads'),
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
        ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    },
    
    // Default Admin Configuration
    DEFAULT_ADMIN: {
        USERNAME: 'admin',
        PASSWORD: 'admin',
        MSG_LIMIT: 999999
    },
    
    // Admin Contact (for limit exceeded messages)
    ADMIN_CONTACT: '918683916682',
    
    // Rate Limiting (Bulk Messages)
    RATE_LIMIT: {
        MIN_DELAY: 36000, // 36 seconds
        MAX_DELAY: 48000  // 48 seconds
    },
    
    // External API / Webhook Configuration
    EXTERNAL_API: {
        ENABLED: true,
        API_KEY: 'whatsapp_api_key_2024_secure',  // Change this to your secret key
        RATE_LIMIT_PER_MINUTE: 30,  // Max 30 requests per minute per API key
        DEFAULT_MSG_LIMIT: 1000     // Default API message limit
    }
};
