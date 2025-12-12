/**
 * Centralized Database Module
 * SQLite connection and all database functions in one place
 */

const fs = require('fs');
const initSqlJs = require('sql.js');
const config = require('./config');

let db = null;

/**
 * Initialize SQLite Database
 */
async function initDatabase() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(config.DATABASE.PATH)) {
        const fileBuffer = fs.readFileSync(config.DATABASE.PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        msg_limit INTEGER DEFAULT 100,
        msg_used INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS message_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT,
        msg_type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'sent',
        error_msg TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // API Limits table
    db.run(`CREATE TABLE IF NOT EXISTS api_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT UNIQUE NOT NULL,
        msg_limit INTEGER DEFAULT 1000,
        msg_used INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Check if default API limit exists
    const apiCheck = db.exec(`SELECT * FROM api_limits WHERE api_key='${config.EXTERNAL_API.API_KEY}'`);
    if (apiCheck.length === 0) {
        db.run(`INSERT INTO api_limits (api_key, msg_limit, msg_used, is_active) VALUES ('${config.EXTERNAL_API.API_KEY}', ${config.EXTERNAL_API.DEFAULT_MSG_LIMIT}, 0, 1)`);
    }
    
    // Check if admin exists, create if not
    const adminCheck = db.exec(`SELECT * FROM users WHERE username='${config.DEFAULT_ADMIN.USERNAME}'`);
    if (adminCheck.length === 0) {
        db.run(`INSERT INTO users (username, password, msg_limit, msg_used, is_admin) VALUES ('${config.DEFAULT_ADMIN.USERNAME}', '${config.DEFAULT_ADMIN.PASSWORD}', ${config.DEFAULT_ADMIN.MSG_LIMIT}, 0, 1)`);
    }
    
    saveDatabase();
    console.log('✅ SQLite Database initialized');
    console.log(`📁 Database Path: ${config.DATABASE.PATH}`);
    return db;
}

/**
 * Save database to file
 */
function saveDatabase() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.DATABASE.PATH, buffer);
}

/**
 * Get database instance
 */
function getDb() {
    return db;
}

// ============= USER FUNCTIONS =============

/**
 * Get user by username
 */
function getUser(username) {
    const result = db.exec(`SELECT * FROM users WHERE username='${username}'`);
    if (result.length > 0 && result[0].values.length > 0) {
        const cols = result[0].columns;
        const vals = result[0].values[0];
        let user = {};
        cols.forEach((c, i) => user[c] = vals[i]);
        return user;
    }
    return null;
}

/**
 * Get all users
 */
function getAllUsers() {
    const result = db.exec("SELECT * FROM users ORDER BY id");
    if (result.length > 0) {
        return result[0].values.map(row => {
            let user = {};
            result[0].columns.forEach((c, i) => user[c] = row[i]);
            return user;
        });
    }
    return [];
}

/**
 * Create new user
 */
function createUser(username, password, msgLimit = 100) {
    try {
        db.run(`INSERT INTO users (username, password, msg_limit, msg_used, is_admin) VALUES ('${username}', '${password}', ${msgLimit}, 0, 0)`);
        saveDatabase();
        return true;
    } catch(e) {
        console.error('Error creating user:', e);
        return false;
    }
}

/**
 * Delete user (non-admin only)
 */
function deleteUser(username) {
    db.run(`DELETE FROM users WHERE username='${username}' AND is_admin=0`);
    saveDatabase();
}

/**
 * Update user message limit
 */
function updateUserLimit(username, newLimit, resetUsed = false) {
    if (resetUsed) {
        db.run(`UPDATE users SET msg_limit = ${newLimit}, msg_used = 0 WHERE username='${username}'`);
    } else {
        db.run(`UPDATE users SET msg_limit = ${newLimit} WHERE username='${username}'`);
    }
    saveDatabase();
}

/**
 * Add to user's message limit
 */
function addToUserLimit(username, addLimit) {
    db.run(`UPDATE users SET msg_limit = msg_limit + ${addLimit} WHERE username='${username}'`);
    saveDatabase();
}

/**
 * Increment messages used count
 */
function incrementMsgUsed(username) {
    db.run(`UPDATE users SET msg_used = msg_used + 1 WHERE username='${username}'`);
    saveDatabase();
}

// ============= MESSAGE HISTORY FUNCTIONS =============

/**
 * Log a message to history
 */
function logMessage(username, phone, message, msgType, status, errorMsg = null) {
    const msg = message ? message.replace(/'/g, "''") : '';
    const err = errorMsg ? errorMsg.replace(/'/g, "''") : '';
    db.run(`INSERT INTO message_history (username, phone, message, msg_type, status, error_msg) VALUES ('${username}', '${phone}', '${msg}', '${msgType}', '${status}', '${err}')`);
    saveDatabase();
}

/**
 * Get user's message history
 */
function getUserHistory(username, limit = 100) {
    const result = db.exec(`SELECT * FROM message_history WHERE username='${username}' ORDER BY id DESC LIMIT ${limit}`);
    if (result.length > 0) {
        return result[0].values.map(row => {
            let msg = {};
            result[0].columns.forEach((c, i) => msg[c] = row[i]);
            return msg;
        });
    }
    return [];
}

/**
 * Get user statistics
 */
function getUserStats(username) {
    const user = getUser(username);
    const history = getUserHistory(username);
    const sent = history.filter(h => h.status === 'sent').length;
    const failed = history.filter(h => h.status === 'failed').length;
    return {
        user,
        totalSent: sent,
        totalFailed: failed,
        remaining: user ? user.msg_limit - user.msg_used : 0,
        history
    };
}

// ============= API STATS FUNCTIONS =============

/**
 * Get API message statistics
 */
function getApiStats() {
    const result = db.exec(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN msg_type='api_text' THEN 1 ELSE 0 END) as api_text,
        SUM(CASE WHEN msg_type='api_pdf' THEN 1 ELSE 0 END) as api_pdf
    FROM message_history WHERE msg_type LIKE 'api_%'`);
    
    if (result.length > 0 && result[0].values.length > 0) {
        const vals = result[0].values[0];
        return {
            total: vals[0] || 0,
            sent: vals[1] || 0,
            pending: vals[2] || 0,
            failed: vals[3] || 0,
            apiText: vals[4] || 0,
            apiPdf: vals[5] || 0
        };
    }
    return { total: 0, sent: 0, pending: 0, failed: 0, apiText: 0, apiPdf: 0 };
}

/**
 * Get API message history
 */
function getApiHistory(limit = 50) {
    const result = db.exec(`SELECT * FROM message_history WHERE msg_type LIKE 'api_%' ORDER BY id DESC LIMIT ${limit}`);
    if (result.length > 0) {
        return result[0].values.map(row => {
            let msg = {};
            result[0].columns.forEach((c, i) => msg[c] = row[i]);
            return msg;
        });
    }
    return [];
}

// ============= API LIMIT FUNCTIONS =============

/**
 * Get API limit by API key
 */
function getApiLimit(apiKey) {
    const result = db.exec(`SELECT * FROM api_limits WHERE api_key='${apiKey}'`);
    if (result.length > 0 && result[0].values.length > 0) {
        const cols = result[0].columns;
        const vals = result[0].values[0];
        let limit = {};
        cols.forEach((c, i) => limit[c] = vals[i]);
        return limit;
    }
    return null;
}

/**
 * Check if API has remaining limit
 */
function checkApiLimit(apiKey) {
    const limit = getApiLimit(apiKey);
    if (!limit) return { allowed: false, remaining: 0, error: 'Invalid API key' };
    if (!limit.is_active) return { allowed: false, remaining: 0, error: 'API key is disabled' };
    const remaining = limit.msg_limit - limit.msg_used;
    if (remaining <= 0) return { allowed: false, remaining: 0, error: 'API message limit exhausted' };
    return { allowed: true, remaining: remaining, limit: limit };
}

/**
 * Increment API messages used
 */
function incrementApiUsed(apiKey) {
    db.run(`UPDATE api_limits SET msg_used = msg_used + 1, updated_at = CURRENT_TIMESTAMP WHERE api_key='${apiKey}'`);
    saveDatabase();
}

/**
 * Update API limit
 */
function updateApiLimit(apiKey, newLimit, resetUsed = false) {
    if (resetUsed) {
        db.run(`UPDATE api_limits SET msg_limit = ${newLimit}, msg_used = 0, updated_at = CURRENT_TIMESTAMP WHERE api_key='${apiKey}'`);
    } else {
        db.run(`UPDATE api_limits SET msg_limit = ${newLimit}, updated_at = CURRENT_TIMESTAMP WHERE api_key='${apiKey}'`);
    }
    saveDatabase();
}

/**
 * Add to API limit
 */
function addToApiLimit(apiKey, addLimit) {
    db.run(`UPDATE api_limits SET msg_limit = msg_limit + ${addLimit}, updated_at = CURRENT_TIMESTAMP WHERE api_key='${apiKey}'`);
    saveDatabase();
}

/**
 * Toggle API key active status
 */
function toggleApiActive(apiKey, isActive) {
    db.run(`UPDATE api_limits SET is_active = ${isActive ? 1 : 0}, updated_at = CURRENT_TIMESTAMP WHERE api_key='${apiKey}'`);
    saveDatabase();
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
    incrementMsgUsed,
    // Message history functions
    logMessage,
    getUserHistory,
    getUserStats,
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
