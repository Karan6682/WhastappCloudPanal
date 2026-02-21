/**
 * Portable Configuration
 * MSSQL Database Connection
 */
module.exports = {
    PORT: 3001,
    HOST: '0.0.0.0',
    API_BASE_URL: 'http://localhost:3001',
    
    MSSQL: {
        server: '160.250.204.51',
        port: 1433,
        database: 'pathosta_BulkWhatsAppsBusinessDB',
        user: 'pathosta_BulkWhatsAppsBusinessUser',
        password: 'Nbfo9d4A$@fMyka6',
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
    
    DEFAULT_ADMIN: {
        username: 'admin',
        password: 'admin'
    },
    
    MESSAGE_LIMITS: {
        default: 100,
        admin: 999999
    },
    
    UPLOAD_PATH: './uploads',
    SESSION_PATH: './whatsapp-sessions',
    MAX_FILE_SIZE: 10 * 1024 * 1024
};
