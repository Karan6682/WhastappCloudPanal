-- =====================================================
-- WhatsApp Automation Database - Complete Backup
-- Database: SQLite
-- Exported: December 13, 2025
-- Contains: Schema + All Data
-- =====================================================

-- Drop existing tables (for clean import)
DROP TABLE IF EXISTS message_history;
DROP TABLE IF EXISTS api_limits;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS users;


-- =====================================================
-- TABLE 1: users
-- =====================================================
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    msg_limit INTEGER DEFAULT 100,
    msg_used INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Data
INSERT INTO users (id, username, password, msg_limit, msg_used, is_admin, created_at) VALUES
(1, 'admin', 'admin123', 1000000, 48, 1, '2025-12-10 21:44:23'),
(2, 's', 's', 50, 0, 0, '2025-12-10 21:45:54');


-- =====================================================
-- TABLE 2: message_history
-- =====================================================
CREATE TABLE message_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    msg_type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'sent',
    error_msg TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Message History Data (75 records)
INSERT INTO message_history (id, username, phone, message, msg_type, status, error_msg, created_at) VALUES
(1, 'admin', '918683916682', 'PDF: g lab.pdf', 'pdf', 'sent', '', '2025-12-10 21:48:04'),
(2, 'admin', '918683916682', 'karan', 'text', 'sent', '', '2025-12-10 22:27:57'),
(3, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-11 05:26:30'),
(4, 'admin', '917015767127', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-11 05:28:47'),
(5, 'admin', '917015767127', 'PDF: WhatsApp Image 2025-11-16 at 12.03.23_890579e1 (1).pdf', 'pdf', 'sent', '', '2025-12-11 05:29:45'),
(6, 'admin', '918683916682', 'STARNEXT TECHNOLOGIES 
SOFTWARE , WEB , APP', 'text', 'sent', '', '2025-12-11 05:35:49'),
(7, 'admin', '917015767127', 'SEO , SMO , API', 'text', 'sent', '', '2025-12-11 05:36:27'),
(8, 'admin', '918683916682', 'STARNEXT TECHNOLOGIES 
SOFTWARE , WEB , APP', 'text', 'sent', '', '2025-12-11 05:37:09'),
(9, 'admin', '919416056193', 'STARNEXT TECHNOLOGIES 
SOFTWARE , WEB , APP', 'text', 'sent', '', '2025-12-11 05:37:53'),
(10, 'admin', '918683916682', 'karan', 'text', 'sent', '', '2025-12-11 15:55:58'),
(11, 'admin', '919355524057', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 06:47:51'),
(12, 'webhook', '918683916682', 'PDF: document.pdf', 'pdf', 'sent', '', '2025-12-12 08:15:19'),
(13, 'webhook', '918683916682', 'PDF: document.pdf', 'pdf', 'sent', '', '2025-12-12 08:17:10'),
(14, 'webhook', '918683916682', 'PDF: document.pdf', 'pdf', 'sent', '', '2025-12-12 08:17:22'),
(15, 'webhook', '918683916682', 'PDF: document.pdf', 'pdf', 'sent', '', '2025-12-12 08:17:46'),
(16, 'webhook', '918683916682', 'PDF: document.pdf', 'pdf', 'sent', '', '2025-12-12 08:38:15'),
(17, 'webhook', '918683916682', 'PDF: document.pdf', 'pdf', 'sent', '', '2025-12-12 08:46:55'),
(18, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 08:48:56'),
(19, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 08:49:24'),
(20, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 09:07:17'),
(21, 'admin', '919416056193', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 10:10:24'),
(22, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 10:11:24'),
(23, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 11:32:39'),
(24, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 12:15:05'),
(25, 'admin', '918683916682', '8683916682', 'text', 'sent', '', '2025-12-12 14:46:01'),
(26, 'admin', '918683916682', 'PDF: Download Hp Laserjet 1020 Plus Driver For Windows 10 64 Bit !!TOP!!.pdf', 'pdf', 'sent', '', '2025-12-12 14:47:52'),
(27, 'admin', '918683916682', 'HELLO KARAN IS VERYGOOD BOY ♥', 'text', 'sent', '', '2025-12-12 15:16:19'),
(28, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:31:42'),
(29, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:32:49'),
(30, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:33:11'),
(31, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:33:16'),
(32, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:33:39'),
(33, 'admin', '918683916682', 'karan', 'text', 'sent', '', '2025-12-12 15:58:43'),
(34, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:59:02'),
(35, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 15:59:32'),
(36, 'api_user', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 16:03:10'),
(37, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 16:09:11'),
(38, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 16:09:41'),
(39, 'admin', '918683916682', 'karan', 'text', 'sent', '', '2025-12-12 16:09:54'),
(40, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 16:11:22'),
(41, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 16:14:46'),
(42, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 16:22:34'),
(43, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:13:56'),
(44, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:14:20'),
(45, 'admin', '918683916682', 'RAM RAM JI', 'text', 'sent', '', '2025-12-12 17:15:44'),
(46, 'admin', '918683916682', 'KARAN', 'text', 'sent', '', '2025-12-12 17:16:03'),
(47, 'admin', '918683916682', 'karan singh karna', 'text', 'failed', 'WhatsApp not connected', '2025-12-12 17:20:05'),
(48, 'admin', '918683916682', 'karan singh karna', 'text', 'sent', '', '2025-12-12 17:20:16'),
(49, 'admin', '918683916682', 'karan singh karna', 'text', 'sent', '', '2025-12-12 17:20:26'),
(50, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 17:20:57'),
(51, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 17:21:33'),
(52, 'admin', '918683916682', 'Hello  Karan ♥♥♥', 'text', 'sent', '', '2025-12-12 17:24:05'),
(53, 'admin', '918683916682', 'Hello  Karan ♥♥♥', 'text', 'sent', '', '2025-12-12 17:24:15'),
(54, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:24:31'),
(55, 'admin', '918683916682', 'pdf: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:24:57'),
(56, 'admin', '918683916682', 'hello ', 'text', 'sent', '', '2025-12-12 17:47:59'),
(57, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:48:11'),
(58, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:48:27'),
(59, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 17:49:04'),
(60, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 18:01:36'),
(61, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 18:01:37'),
(62, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 18:01:41'),
(63, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 18:02:50'),
(64, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 18:02:59'),
(65, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-12 18:03:07'),
(66, 'admin', '918683916682', 'hello ', 'text', 'failed', 'WhatsApp not connected', '2025-12-12 18:11:33'),
(67, 'admin', '918683916682', 'hello ', 'text', 'sent', '', '2025-12-12 18:11:43'),
(68, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'failed', 'WhatsApp not connected', '2025-12-12 18:19:53'),
(69, 'admin', '918683916682', 'Hello  Karan ♥', 'text', 'sent', '', '2025-12-12 18:20:02'),
(70, 'admin', '918683916682', 'karan is big boy', 'text', 'sent', '', '2025-12-12 18:24:27'),
(71, 'admin', '918683916682', 'karan is big boy 1', 'text', 'sent', '', '2025-12-12 18:24:50'),
(72, 'admin', '918683916682', 'karan is  1', 'text', 'sent', '', '2025-12-12 23:58:38'),
(73, 'admin', '918683916682', 'hello kkhh', 'text', 'sent', '', '2025-12-13 00:03:17'),
(74, 'admin', '918683916682', 'bhgvhy', 'text', 'sent', '', '2025-12-13 00:03:39'),
(75, 'admin', '918683916682', 'PDF: document.pdf', 'api_pdf', 'sent', '', '2025-12-13 21:06:06');


-- =====================================================
-- TABLE 3: api_limits
-- =====================================================
CREATE TABLE api_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT UNIQUE NOT NULL,
    msg_limit INTEGER DEFAULT 1000,
    msg_used INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Limits Data
INSERT INTO api_limits (id, api_key, msg_limit, msg_used, is_active, created_at, updated_at) VALUES
(1, 'whatsapp_api_key_2024_secure', 100, 28, 1, '2025-12-12 09:05:33', '2025-12-13 15:36:06');


-- =====================================================
-- TABLE 4: app_settings
-- =====================================================
CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App Settings Data
INSERT INTO app_settings (id, setting_key, setting_value, updated_at) VALUES
(1, 'api_docs_password', 'karan11**', '2025-12-12 16:57:31');


-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_message_history_username ON message_history(username);
CREATE INDEX idx_message_history_created_at ON message_history(created_at);
CREATE INDEX idx_message_history_status ON message_history(status);
CREATE INDEX idx_users_username ON users(username);


-- =====================================================
-- DATABASE STATISTICS
-- =====================================================
-- Total Users: 2
-- Total Messages: 75
-- Sent: 72
-- Failed: 3
-- API Messages: 28
-- Web Messages: 47
-- Date Range: 2025-12-10 to 2025-12-13
-- =====================================================

-- END OF BACKUP
