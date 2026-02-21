-- =====================================================
-- WhatsApp Automation Database Schema
-- Database: SQLite
-- Language: SQL (Structured Query Language)
-- Created: December 13, 2025
-- =====================================================

-- =====================================================
-- TABLE 1: users
-- Purpose: Store user accounts and message limits
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    msg_limit INTEGER DEFAULT 100,
    msg_used INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default admin user
INSERT OR IGNORE INTO users (username, password, msg_limit, msg_used, is_admin) 
VALUES ('admin', 'admin123', 100, 0, 1);


-- =====================================================
-- TABLE 2: message_history
-- Purpose: Log all sent messages (Web + API)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    msg_type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'sent',
    error_msg TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- msg_type values:
-- 'text'     - Web text message
-- 'pdf'      - Web PDF document
-- 'api_text' - API text message
-- 'api_pdf'  - API PDF document

-- status values:
-- 'sent'    - Successfully sent
-- 'pending' - In queue
-- 'failed'  - Failed to send


-- =====================================================
-- TABLE 3: api_limits
-- Purpose: API key rate limiting
-- =====================================================
CREATE TABLE IF NOT EXISTS api_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT UNIQUE NOT NULL,
    msg_limit INTEGER DEFAULT 1000,
    msg_used INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default API key
INSERT OR IGNORE INTO api_limits (api_key, msg_limit, msg_used, is_active) 
VALUES ('whatsapp_api_key_2024_secure', 1000, 0, 1);


-- =====================================================
-- TABLE 4: app_settings
-- Purpose: Application settings (passwords, configs)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default API docs password
INSERT OR IGNORE INTO app_settings (setting_key, setting_value) 
VALUES ('api_docs_password', 'karan11**');


-- =====================================================
-- INDEXES for better performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_message_history_username ON message_history(username);
CREATE INDEX IF NOT EXISTS idx_message_history_created_at ON message_history(created_at);
CREATE INDEX IF NOT EXISTS idx_message_history_status ON message_history(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);


-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

-- Get all users
-- SELECT * FROM users;

-- Get user message history
-- SELECT * FROM message_history WHERE username='admin' ORDER BY created_at DESC;

-- Get message stats by date
-- SELECT COUNT(*) as total, 
--        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
--        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
-- FROM message_history 
-- WHERE username='admin' 
-- AND DATE(created_at) = DATE('2025-12-13');

-- Get API vs Web message count
-- SELECT 
--     SUM(CASE WHEN msg_type LIKE 'api_%' THEN 1 ELSE 0 END) as api_count,
--     SUM(CASE WHEN msg_type NOT LIKE 'api_%' THEN 1 ELSE 0 END) as web_count
-- FROM message_history;

-- Update user message limit
-- UPDATE users SET msg_limit = 500 WHERE username='admin';

-- Reset user message count
-- UPDATE users SET msg_used = 0 WHERE username='admin';


-- =====================================================
-- END OF SCHEMA
-- =====================================================
