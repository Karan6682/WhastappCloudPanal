/**
 * Centralized Database Module
 * MSSQL (SQL Server) connection and all database functions
 * Converted from SQLite to MSSQL
 */

const sql = require('mssql');
const config = require('./config');

let pool = null;

/**
 * Initialize MSSQL Database Connection
 */
async function initDatabase() {
    try {
        pool = await sql.connect(config.MSSQL);
        console.log('✅ MSSQL Database connected');
        console.log(`📁 Server: ${config.MSSQL.server}`);
        console.log(`📁 Database: ${config.MSSQL.database}`);
        
        // Create tables if not exist
        await createTables();
        
        // Initialize default data
        await initDefaultData();
        
        return pool;
    } catch (error) {
        console.error('❌ MSSQL Connection Error:', error.message);
        throw error;
    }
}

/**
 * Create all tables
 */
async function createTables() {
    try {
        // Users table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(100) UNIQUE NOT NULL,
                password NVARCHAR(255) NOT NULL,
                msg_limit INT DEFAULT 100,
                msg_used INT DEFAULT 0,
                is_admin INT DEFAULT 0,
                menu_permissions NVARCHAR(MAX) DEFAULT 'dashboard,messages,documents,bulk,connection,sessions,settings',
                created_at DATETIME DEFAULT GETDATE()
            )
        `);
        
        // Add menu_permissions column if not exists (for existing tables)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'menu_permissions')
            ALTER TABLE users ADD menu_permissions NVARCHAR(MAX) DEFAULT 'dashboard,messages,documents,bulk,connection,sessions,settings'
        `);
        
        // Message history table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='message_history' AND xtype='U')
            CREATE TABLE message_history (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(100) NOT NULL,
                phone NVARCHAR(50) NOT NULL,
                message NVARCHAR(MAX),
                msg_type NVARCHAR(50) DEFAULT 'text',
                status NVARCHAR(50) DEFAULT 'sent',
                error_msg NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE()
            )
        `);
        
        // API Limits table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='api_limits' AND xtype='U')
            CREATE TABLE api_limits (
                id INT IDENTITY(1,1) PRIMARY KEY,
                api_key NVARCHAR(255) UNIQUE NOT NULL,
                msg_limit INT DEFAULT 1000,
                msg_used INT DEFAULT 0,
                is_active INT DEFAULT 1,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
        `);
        
        // App Settings table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='app_settings' AND xtype='U')
            CREATE TABLE app_settings (
                id INT IDENTITY(1,1) PRIMARY KEY,
                setting_key NVARCHAR(100) UNIQUE NOT NULL,
                setting_value NVARCHAR(MAX) NOT NULL,
                updated_at DATETIME DEFAULT GETDATE()
            )
        `);
        
        console.log('✅ Tables verified/created');
    } catch (error) {
        console.error('Error creating tables:', error.message);
    }
}

/**
 * Initialize default data
 */
async function initDefaultData() {
    try {
        // Check and create default admin
        const adminCheck = await pool.request()
            .input('username', sql.NVarChar, config.DEFAULT_ADMIN.USERNAME)
            .query('SELECT * FROM users WHERE username = @username');
        
        if (adminCheck.recordset.length === 0) {
            await pool.request()
                .input('username', sql.NVarChar, config.DEFAULT_ADMIN.USERNAME)
                .input('password', sql.NVarChar, config.DEFAULT_ADMIN.PASSWORD)
                .input('msg_limit', sql.Int, config.DEFAULT_ADMIN.MSG_LIMIT)
                .query('INSERT INTO users (username, password, msg_limit, msg_used, is_admin) VALUES (@username, @password, @msg_limit, 0, 1)');
            console.log('✅ Default admin created');
        }
        
        // Check and create default API key
        const apiCheck = await pool.request()
            .input('api_key', sql.NVarChar, config.EXTERNAL_API.API_KEY)
            .query('SELECT * FROM api_limits WHERE api_key = @api_key');
        
        if (apiCheck.recordset.length === 0) {
            await pool.request()
                .input('api_key', sql.NVarChar, config.EXTERNAL_API.API_KEY)
                .input('msg_limit', sql.Int, config.EXTERNAL_API.DEFAULT_MSG_LIMIT)
                .query('INSERT INTO api_limits (api_key, msg_limit, msg_used, is_active) VALUES (@api_key, @msg_limit, 0, 1)');
            console.log('✅ Default API key created');
        }
        
        // Check and create API docs password
        const settingCheck = await pool.request()
            .input('key', sql.NVarChar, 'api_docs_password')
            .query('SELECT * FROM app_settings WHERE setting_key = @key');
        
        if (settingCheck.recordset.length === 0) {
            await pool.request()
                .input('key', sql.NVarChar, 'api_docs_password')
                .input('value', sql.NVarChar, 'karan11**')
                .query('INSERT INTO app_settings (setting_key, setting_value) VALUES (@key, @value)');
            console.log('✅ Default API docs password created');
        }
    } catch (error) {
        console.error('Error initializing default data:', error.message);
    }
}

/**
 * Save database (no-op for MSSQL, kept for compatibility)
 */
function saveDatabase() {
    // Not needed for MSSQL, changes are auto-committed
}

/**
 * Get database pool instance
 */
function getDb() {
    return pool;
}

// ============= USER FUNCTIONS =============

/**
 * Get user by username
 */
async function getUser(username) {
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM users WHERE username = @username');
        return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
        console.error('getUser error:', error.message);
        return null;
    }
}

/**
 * Get all users
 */
async function getAllUsers() {
    try {
        const result = await pool.request().query('SELECT * FROM users ORDER BY id');
        return result.recordset;
    } catch (error) {
        console.error('getAllUsers error:', error.message);
        return [];
    }
}

/**
 * Create new user
 */
async function createUser(username, password, msgLimit = 100, menuPermissions = 'dashboard,messages,documents,bulk,connection,sessions,settings') {
    try {
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .input('msg_limit', sql.Int, msgLimit)
            .input('menu_permissions', sql.NVarChar, menuPermissions)
            .query('INSERT INTO users (username, password, msg_limit, msg_used, is_admin, menu_permissions) VALUES (@username, @password, @msg_limit, 0, 0, @menu_permissions)');
        return true;
    } catch (error) {
        console.error('createUser error:', error.message);
        return false;
    }
}

/**
 * Delete user (non-admin only)
 */
async function deleteUser(username) {
    try {
        await pool.request()
            .input('username', sql.NVarChar, username)
            .query('DELETE FROM users WHERE username = @username AND is_admin = 0');
    } catch (error) {
        console.error('deleteUser error:', error.message);
    }
}

/**
 * Update user message limit
 */
async function updateUserLimit(username, newLimit, resetUsed = false) {
    try {
        if (resetUsed) {
            await pool.request()
                .input('username', sql.NVarChar, username)
                .input('msg_limit', sql.Int, newLimit)
                .query('UPDATE users SET msg_limit = @msg_limit, msg_used = 0 WHERE username = @username');
        } else {
            await pool.request()
                .input('username', sql.NVarChar, username)
                .input('msg_limit', sql.Int, newLimit)
                .query('UPDATE users SET msg_limit = @msg_limit WHERE username = @username');
        }
    } catch (error) {
        console.error('updateUserLimit error:', error.message);
    }
}

/**
 * Add to user's message limit
 */
async function addToUserLimit(username, addLimit) {
    try {
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('addLimit', sql.Int, addLimit)
            .query('UPDATE users SET msg_limit = msg_limit + @addLimit WHERE username = @username');
    } catch (error) {
        console.error('addToUserLimit error:', error.message);
    }
}

/**
 * Update user menu permissions
 */
async function updateUserMenuPermissions(username, menuPermissions) {
    try {
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('menu_permissions', sql.NVarChar, menuPermissions)
            .query('UPDATE users SET menu_permissions = @menu_permissions WHERE username = @username');
        return true;
    } catch (error) {
        console.error('updateUserMenuPermissions error:', error.message);
        return false;
    }
}

/**
 * Increment messages used count
 */
async function incrementMsgUsed(username) {
    try {
        await pool.request()
            .input('username', sql.NVarChar, username)
            .query('UPDATE users SET msg_used = msg_used + 1 WHERE username = @username');
    } catch (error) {
        console.error('incrementMsgUsed error:', error.message);
    }
}

// ============= MESSAGE HISTORY FUNCTIONS =============

/**
 * Get IST timestamp
 */
function getISTTimestamp() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Log a message to history
 */
async function logMessage(username, phone, message, msgType, status, errorMsg = null) {
    try {
        const istTime = getISTTimestamp();
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('phone', sql.NVarChar, phone)
            .input('message', sql.NVarChar, message || '')
            .input('msg_type', sql.NVarChar, msgType)
            .input('status', sql.NVarChar, status)
            .input('error_msg', sql.NVarChar, errorMsg || '')
            .input('created_at', sql.DateTime, new Date(istTime))
            .query('INSERT INTO message_history (username, phone, message, msg_type, status, error_msg, created_at) VALUES (@username, @phone, @message, @msg_type, @status, @error_msg, @created_at)');
    } catch (error) {
        console.error('logMessage error:', error.message);
    }
}

/**
 * Get user's message history
 */
async function getUserHistory(username, limit = 100) {
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('limit', sql.Int, limit)
            .query('SELECT TOP (@limit) * FROM message_history WHERE username = @username ORDER BY created_at DESC');
        return result.recordset;
    } catch (error) {
        console.error('getUserHistory error:', error.message);
        return [];
    }
}

/**
 * Get user statistics
 */
async function getUserStats(username) {
    try {
        const user = await getUser(username);
        const history = await getUserHistory(username);
        const sent = history.filter(h => h.status === 'sent').length;
        const failed = history.filter(h => h.status === 'failed').length;
        const msgStats = await getUserMessageStats(username);
        const actualUsed = msgStats.total || 0;
        return {
            user,
            totalSent: sent,
            totalFailed: failed,
            remaining: user ? user.msg_limit - actualUsed : 0,
            history
        };
    } catch (error) {
        console.error('getUserStats error:', error.message);
        return { user: null, totalSent: 0, totalFailed: 0, remaining: 0, history: [] };
    }
}

/**
 * Get user-specific message statistics
 */
async function getUserMessageStats(username) {
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN msg_type='text' OR msg_type='api_text' THEN 1 ELSE 0 END) as text_count,
                SUM(CASE WHEN msg_type='pdf' OR msg_type='api_pdf' THEN 1 ELSE 0 END) as pdf_count,
                SUM(CASE WHEN msg_type LIKE 'api_%' THEN 1 ELSE 0 END) as api_count,
                SUM(CASE WHEN msg_type NOT LIKE 'api_%' THEN 1 ELSE 0 END) as web_count
            FROM message_history WHERE username = @username`);
        
        if (result.recordset.length > 0) {
            const r = result.recordset[0];
            return {
                total: r.total || 0,
                sent: r.sent || 0,
                pending: r.pending || 0,
                failed: r.failed || 0,
                textCount: r.text_count || 0,
                pdfCount: r.pdf_count || 0,
                apiCount: r.api_count || 0,
                webCount: r.web_count || 0
            };
        }
        return { total: 0, sent: 0, pending: 0, failed: 0, textCount: 0, pdfCount: 0, apiCount: 0, webCount: 0 };
    } catch (error) {
        console.error('getUserMessageStats error:', error.message);
        return { total: 0, sent: 0, pending: 0, failed: 0, textCount: 0, pdfCount: 0, apiCount: 0, webCount: 0 };
    }
}

/**
 * Get user-specific message history
 */
async function getUserMessageHistory(username, limit = 30) {
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('limit', sql.Int, limit)
            .query('SELECT TOP (@limit) * FROM message_history WHERE username = @username ORDER BY created_at DESC');
        return result.recordset;
    } catch (error) {
        console.error('getUserMessageHistory error:', error.message);
        return [];
    }
}

/**
 * Get user-specific message history with date range filter
 */
async function getUserMessageHistoryByDate(username, startDate, endDate) {
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`SELECT * FROM message_history 
                WHERE username = @username 
                AND CAST(created_at AS DATE) >= @startDate 
                AND CAST(created_at AS DATE) <= @endDate 
                ORDER BY created_at DESC`);
        return result.recordset;
    } catch (error) {
        console.error('getUserMessageHistoryByDate error:', error.message);
        return [];
    }
}

/**
 * Get user message stats with date range filter
 */
async function getUserMessageStatsByDate(username, startDate, endDate) {
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN msg_type='text' OR msg_type='api_text' THEN 1 ELSE 0 END) as text_count,
                SUM(CASE WHEN msg_type='pdf' OR msg_type='api_pdf' THEN 1 ELSE 0 END) as pdf_count,
                SUM(CASE WHEN msg_type LIKE 'api_%' THEN 1 ELSE 0 END) as api_count,
                SUM(CASE WHEN msg_type NOT LIKE 'api_%' THEN 1 ELSE 0 END) as web_count
            FROM message_history 
            WHERE username = @username 
            AND CAST(created_at AS DATE) >= @startDate 
            AND CAST(created_at AS DATE) <= @endDate`);
        
        if (result.recordset.length > 0) {
            const r = result.recordset[0];
            return {
                total: r.total || 0,
                sent: r.sent || 0,
                pending: r.pending || 0,
                failed: r.failed || 0,
                textCount: r.text_count || 0,
                pdfCount: r.pdf_count || 0,
                apiCount: r.api_count || 0,
                webCount: r.web_count || 0
            };
        }
        return { total: 0, sent: 0, pending: 0, failed: 0, textCount: 0, pdfCount: 0, apiCount: 0, webCount: 0 };
    } catch (error) {
        console.error('getUserMessageStatsByDate error:', error.message);
        return { total: 0, sent: 0, pending: 0, failed: 0, textCount: 0, pdfCount: 0, apiCount: 0, webCount: 0 };
    }
}

// ============= APP SETTINGS FUNCTIONS =============

/**
 * Get setting value by key
 */
async function getSetting(key) {
    try {
        const result = await pool.request()
            .input('key', sql.NVarChar, key)
            .query('SELECT setting_value FROM app_settings WHERE setting_key = @key');
        return result.recordset.length > 0 ? result.recordset[0].setting_value : null;
    } catch (error) {
        console.error('getSetting error:', error.message);
        return null;
    }
}

/**
 * Update setting value
 */
async function updateSetting(key, value) {
    try {
        await pool.request()
            .input('key', sql.NVarChar, key)
            .input('value', sql.NVarChar, value)
            .query('UPDATE app_settings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = @key');
    } catch (error) {
        console.error('updateSetting error:', error.message);
    }
}

// ============= API STATS FUNCTIONS =============

/**
 * Get API message statistics
 */
async function getApiStats() {
    try {
        const result = await pool.request().query(`SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN msg_type='api_text' THEN 1 ELSE 0 END) as api_text,
            SUM(CASE WHEN msg_type='api_pdf' THEN 1 ELSE 0 END) as api_pdf
        FROM message_history WHERE msg_type LIKE 'api_%'`);
        
        if (result.recordset.length > 0) {
            const r = result.recordset[0];
            return {
                total: r.total || 0,
                sent: r.sent || 0,
                pending: r.pending || 0,
                failed: r.failed || 0,
                apiText: r.api_text || 0,
                apiPdf: r.api_pdf || 0
            };
        }
        return { total: 0, sent: 0, pending: 0, failed: 0, apiText: 0, apiPdf: 0 };
    } catch (error) {
        console.error('getApiStats error:', error.message);
        return { total: 0, sent: 0, pending: 0, failed: 0, apiText: 0, apiPdf: 0 };
    }
}

/**
 * Get API message history
 */
async function getApiHistory(limit = 50) {
    try {
        const result = await pool.request()
            .input('limit', sql.Int, limit)
            .query(`SELECT TOP (@limit) * FROM message_history WHERE msg_type LIKE 'api_%' ORDER BY created_at DESC`);
        return result.recordset;
    } catch (error) {
        console.error('getApiHistory error:', error.message);
        return [];
    }
}

// ============= API LIMIT FUNCTIONS =============

/**
 * Get API limit by API key
 */
async function getApiLimit(apiKey) {
    try {
        const result = await pool.request()
            .input('api_key', sql.NVarChar, apiKey)
            .query('SELECT * FROM api_limits WHERE api_key = @api_key');
        return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
        console.error('getApiLimit error:', error.message);
        return null;
    }
}

/**
 * Check if API has remaining limit
 */
async function checkApiLimit(apiKey) {
    try {
        const limit = await getApiLimit(apiKey);
        if (!limit) return { allowed: false, remaining: 0, error: 'Invalid API key' };
        if (!limit.is_active) return { allowed: false, remaining: 0, error: 'API key is disabled' };
        const remaining = limit.msg_limit - limit.msg_used;
        if (remaining <= 0) return { allowed: false, remaining: 0, error: 'API message limit exhausted' };
        return { allowed: true, remaining: remaining, limit: limit };
    } catch (error) {
        console.error('checkApiLimit error:', error.message);
        return { allowed: false, remaining: 0, error: error.message };
    }
}

/**
 * Increment API messages used
 */
async function incrementApiUsed(apiKey) {
    try {
        await pool.request()
            .input('api_key', sql.NVarChar, apiKey)
            .query('UPDATE api_limits SET msg_used = msg_used + 1, updated_at = GETDATE() WHERE api_key = @api_key');
    } catch (error) {
        console.error('incrementApiUsed error:', error.message);
    }
}

/**
 * Update API limit
 */
async function updateApiLimit(apiKey, newLimit, resetUsed = false) {
    try {
        if (resetUsed) {
            await pool.request()
                .input('api_key', sql.NVarChar, apiKey)
                .input('msg_limit', sql.Int, newLimit)
                .query('UPDATE api_limits SET msg_limit = @msg_limit, msg_used = 0, updated_at = GETDATE() WHERE api_key = @api_key');
        } else {
            await pool.request()
                .input('api_key', sql.NVarChar, apiKey)
                .input('msg_limit', sql.Int, newLimit)
                .query('UPDATE api_limits SET msg_limit = @msg_limit, updated_at = GETDATE() WHERE api_key = @api_key');
        }
    } catch (error) {
        console.error('updateApiLimit error:', error.message);
    }
}

/**
 * Add to API limit
 */
async function addToApiLimit(apiKey, addLimit) {
    try {
        await pool.request()
            .input('api_key', sql.NVarChar, apiKey)
            .input('addLimit', sql.Int, addLimit)
            .query('UPDATE api_limits SET msg_limit = msg_limit + @addLimit, updated_at = GETDATE() WHERE api_key = @api_key');
    } catch (error) {
        console.error('addToApiLimit error:', error.message);
    }
}

/**
 * Toggle API key active status
 */
async function toggleApiActive(apiKey, isActive) {
    try {
        await pool.request()
            .input('api_key', sql.NVarChar, apiKey)
            .input('is_active', sql.Int, isActive ? 1 : 0)
            .query('UPDATE api_limits SET is_active = @is_active, updated_at = GETDATE() WHERE api_key = @api_key');
    } catch (error) {
        console.error('toggleApiActive error:', error.message);
    }
}

// Export all functions
module.exports = {
    initDatabase,
    saveDatabase,
    getDb,
    // User functions
    getUser,
    getAllUsers,
    createUser,
    deleteUser,
    updateUserLimit,
    addToUserLimit,
    updateUserMenuPermissions,
    incrementMsgUsed,
    // Message history functions
    logMessage,
    getUserHistory,
    getUserStats,
    getUserMessageStats,
    getUserMessageHistory,
    getUserMessageHistoryByDate,
    getUserMessageStatsByDate,
    // App settings functions
    getSetting,
    updateSetting,
    // API stats functions
    getApiStats,
    getApiHistory,
    // API limit functions
    getApiLimit,
    checkApiLimit,
    incrementApiUsed,
    updateApiLimit,
    addToApiLimit,
    toggleApiActive
};
