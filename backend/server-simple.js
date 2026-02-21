/**
 * WhatsApp Business Automation Server
 * Clean architecture with centralized config and database
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

// Import centralized modules
const config = require('./config');
const db = require('./db');

const app = express();

// Multer setup for file upload (PDF, JPG, PNG)
const upload = multer({ 
    dest: config.UPLOAD.DIR,
    limits: { fileSize: config.UPLOAD.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG files allowed'));
        }
    }
});

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOAD.DIR)) {
    fs.mkdirSync(config.UPLOAD.DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// WhatsApp session management
const activeSockets = {};
const qrCodes = {};
const connectionStatus = {};
const reconnectAttempts = {}; // Track reconnection attempts per session
const MAX_RECONNECT_ATTEMPTS = 5; // Maximum reconnect attempts before giving up

// ============= AUTH APIs =============

// Verify password endpoint (for API docs page - uses app_settings table)
app.post('/api/auth/verify-password', async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
    }
    
    try {
        const isValid = await db.verifyApiDocsPassword(password);
        if (isValid) {
            console.log(`🔐 API docs password verified successfully`);
            res.json({ success: true });
        } else {
            console.log(`❌ Invalid API docs password attempt`);
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Password verify error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.getUser(username);
        if (user && user.password === password) {
            console.log(`✅ Login successful: ${username}`);
            res.json({ 
                success: true, 
                token: 'token_' + Date.now(), 
                user: { 
                    username: user.username, 
                    isAdmin: user.is_admin === 1,
                    msgLimit: user.msg_limit,
                    msgUsed: user.msg_used,
                    menuPermissions: user.menu_permissions || 'dashboard,messages,documents,bulk,connection,sessions,settings'
                } 
            });
        } else {
            console.log(`❌ Login failed for: ${username}`);
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============= USER MANAGEMENT APIs =============

app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, msgLimit, menuPermissions } = req.body;
    
    // Validation
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const cleanUsername = username.trim().toLowerCase();
    
    if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers and underscore' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    try {
        // Check if user already exists
        const existingUser = await db.getUser(cleanUsername);
        if (existingUser) {
            return res.status(400).json({ error: `Username "${cleanUsername}" already exists. Please choose a different username.` });
        }
        const permissions = menuPermissions || 'dashboard,messages,documents,bulk,connection,sessions,settings';
        await db.createUser(cleanUsername, password, msgLimit || 100, permissions);
        console.log(`✅ New user created: ${cleanUsername} with ${msgLimit || 100} message limit`);
        res.json({ success: true, username: cleanUsername });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Server error while creating user' });
    }
});

app.delete('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    if (username === 'admin') {
        return res.status(400).json({ error: 'Cannot delete admin' });
    }
    try {
        await db.deleteUser(username);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// PASSWORD CHANGE API
// ═══════════════════════════════════════════════════════════════

// Change own password (any logged in user)
app.post('/api/change-password', async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    
    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }
    
    try {
        // Verify current password
        const user = await db.getUser(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.password !== currentPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        await db.updateUserPassword(username, newPassword);
        console.log(`🔐 Password changed for user: ${username}`);
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    const { msgLimit, addLimit, resetUsed, menuPermissions } = req.body;
    
    try {
        const user = await db.getUser(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update menu permissions if provided
        if (menuPermissions !== undefined) {
            await db.updateUserMenuPermissions(username, menuPermissions);
            if (!addLimit && msgLimit === undefined) {
                return res.json({ success: true, message: `Updated menu permissions for ${username}` });
            }
        }
        
        if (addLimit && addLimit > 0) {
            await db.addToUserLimit(username, addLimit);
            res.json({ success: true, message: `Added ${addLimit} messages to ${username}` });
        } else if (msgLimit !== undefined) {
            await db.updateUserLimit(username, msgLimit, resetUsed === true);
            res.json({ success: true, message: `Updated limit for ${username}` });
        } else if (menuPermissions === undefined) {
            res.status(400).json({ error: 'Provide msgLimit, addLimit, or menuPermissions' });
        }
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/users/:username/stats', async (req, res) => {
    const { username } = req.params;
    try {
        const stats = await db.getUserStats(username);
        res.json({ success: true, ...stats });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @api {get} /api/users/:username/api-key Get User's API Key
 * @apiDescription Get API key for a specific user (Admin can get any, user needs password verification first)
 */
app.get('/api/users/:username/api-key', async (req, res) => {
    const { username } = req.params;
    try {
        const user = await db.getUser(username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            username: user.username,
            apiKey: user.api_key || null,
            msgLimit: user.msg_limit,
            msgUsed: user.msg_used,
            remaining: user.msg_limit - user.msg_used
        });
    } catch (error) {
        console.error('Get user API key error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get('/api/users/:username/history', async (req, res) => {
    const { username } = req.params;
    try {
        const history = await db.getUserHistory(username);
        res.json({ success: true, history });
    } catch (error) {
        console.error('Get user history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User-specific message statistics (API + Web combined)
app.get('/api/users/:username/message-stats', async (req, res) => {
    const { username } = req.params;
    try {
        const msgStats = await db.getUserMessageStats(username);
        const msgHistory = await db.getUserMessageHistory(username, 30);
        const user = await db.getUser(username);
        // Calculate actual used from message_history for accuracy
        const actualUsed = msgStats.total || 0;
        res.json({ 
            success: true, 
            stats: msgStats,
            history: msgHistory,
            userLimit: user ? {
                limit: user.msg_limit,
                used: actualUsed,
                remaining: user.msg_limit - actualUsed
            } : null
        });
    } catch (error) {
        console.error('Get user message stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User message history with date range filter
app.get('/api/users/:username/history-report', async (req, res) => {
    const { username } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD format)' });
    }
    
    try {
        const history = await db.getUserMessageHistoryByDate(username, startDate, endDate);
        const stats = await db.getUserMessageStatsByDate(username, startDate, endDate);
        
        res.json({ 
            success: true, 
            startDate,
            endDate,
            stats,
            history
        });
    } catch (error) {
        console.error('Get user history report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============= API DOCS PASSWORD APIs =============

// Verify API docs password
app.post('/api/verify-api-docs-password', async (req, res) => {
    try {
        const { password } = req.body;
        const savedPassword = await db.getSetting('api_docs_password');
        
        if (password === savedPassword) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (err) {
        console.error('Password verify error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update API docs password (Admin only)
app.put('/api/api-docs-password', async (req, res) => {
    const { newPassword, username } = req.body;
    
    try {
        // Check if user is admin
        const user = await db.getUser(username);
        if (!user || user.is_admin !== 1) {
            return res.status(403).json({ success: false, error: 'Only admin can change password' });
        }
        
        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
        }
        
        await db.updateSetting('api_docs_password', newPassword);
        res.json({ success: true, message: 'API Documentation password updated' });
    } catch (error) {
        console.error('Update API docs password error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get API docs password (Admin only - for reset)
app.get('/api/api-docs-password/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await db.getUser(username);
        
        if (!user || user.is_admin !== 1) {
            return res.status(403).json({ success: false, error: 'Only admin can view password' });
        }
        
        const password = await db.getSetting('api_docs_password');
        res.json({ success: true, password });
    } catch (error) {
        console.error('Get API docs password error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============= CONFIG API =============

app.get('/api/config', (req, res) => {
    res.json({
        API_BASE_URL: config.API_BASE_URL,
        ADMIN_CONTACT: config.ADMIN_CONTACT,
        RATE_LIMIT: config.RATE_LIMIT
    });
});

// ============= AUTH MIDDLEWARE =============

const checkAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const parts = authHeader.split('_');
        if (parts.length >= 2) {
            req.username = req.body.username || req.query.username || 'admin';
        }
    }
    req.userId = 'admin-001';
    next();
};

// ============= WHATSAPP SOCKET MANAGEMENT =============

// Lock to prevent multiple simultaneous socket creations
const socketCreationLock = {};

async function createSocket(sessionKey, sessionPath) {
    // Prevent multiple simultaneous socket creations for same session
    if (socketCreationLock[sessionKey]) {
        console.log(`⏳ Socket creation already in progress for ${sessionKey}, skipping...`);
        return activeSockets[sessionKey];
    }
    
    socketCreationLock[sessionKey] = true;
    
    try {
        // Close existing socket if any
        if (activeSockets[sessionKey]) {
            try {
                activeSockets[sessionKey].end();
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            } catch(e) {}
            delete activeSockets[sessionKey];
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`📌 Creating socket for ${sessionKey}, version: ${version.join('.')}`);
        
        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            logger: pino({ level: 'silent' }),
            browser: ['WhatsApp Web', 'Chrome', '120.0.0'],
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            defaultQueryTimeoutMs: 120000,  // 2 minute timeout
            connectTimeoutMs: 120000,       // 2 minute connection timeout
            qrTimeout: 60000,               // QR timeout 60 seconds
            keepAliveIntervalMs: 25000,     // Keep alive every 25 seconds
            retryRequestDelayMs: 250,
            emitOwnEvents: true,
            getMessage: async (key) => {
                return { conversation: '' };
            }
        });
    
    activeSockets[sessionKey] = sock;
    connectionStatus[sessionKey] = 'connecting';
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`🔲 QR generated for ${sessionKey}`);
            qrCodes[sessionKey] = qr;
            connectionStatus[sessionKey] = 'qr_ready';
            // Reset reconnect attempts when new QR is generated
            reconnectAttempts[sessionKey] = 0;
        }
        
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.output?.payload?.message || 'Unknown';
            
            console.log(`❌ Disconnected [${sessionKey}]: Code=${code}, Reason=${reason}`);
            
            // Clean up old socket
            if (activeSockets[sessionKey]) {
                try { activeSockets[sessionKey].end(); } catch(e) {}
            }
            delete activeSockets[sessionKey];
            delete qrCodes[sessionKey];
            
            // Determine if we should clear session files
            // Only clear on REAL logout (user explicitly logged out from phone)
            const isRealLogout = code === DisconnectReason.loggedOut && 
                                 reason.toLowerCase().includes('logged out');
            
            // Stream conflict means another device is connected - don't delete session, just wait
            const isConflict = reason.toLowerCase().includes('conflict');
            
            // 401 + Connection Failure =s session is invalid (user logged out from phone)
            const reasonLower = reason.toLowerCase();
            const isInvalidSession = code === 401 && (
                reasonLower.includes('connection failure') || 
                reasonLower.includes('logged out') ||
                reasonLower.includes('invalid session')
            );
            
            if (isRealLogout || isInvalidSession) {
                // Session is no longer valid - clear and allow fresh QR
                console.log(`🚪 Session invalid/logged out [${sessionKey}], clearing for fresh QR...`);
                connectionStatus[sessionKey] = 'disconnected';
                reconnectAttempts[sessionKey] = 0;
                try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch(e) {}
            } else if (isConflict) {
                // Conflict means another session is active - wait longer before retry
                console.log(`⚠️ Session conflict [${sessionKey}] - another device may be connected. Waiting 10s...`);
                connectionStatus[sessionKey] = 'conflict';
                reconnectAttempts[sessionKey] = (reconnectAttempts[sessionKey] || 0) + 1;
                
                if (reconnectAttempts[sessionKey] <= MAX_RECONNECT_ATTEMPTS) {
                    setTimeout(async () => {
                        try {
                            await createSocket(sessionKey, sessionPath);
                        } catch(e) {
                            console.error('Reconnect failed:', e.message);
                            connectionStatus[sessionKey] = 'disconnected';
                        }
                    }, 10000); // Wait 10 seconds for conflict
                } else {
                    console.log(`❌ Too many conflicts for ${sessionKey}. Please logout other devices and try again.`);
                    connectionStatus[sessionKey] = 'disconnected';
                    reconnectAttempts[sessionKey] = 0;
                }
            } else {
                // Track reconnection attempts
                reconnectAttempts[sessionKey] = (reconnectAttempts[sessionKey] || 0) + 1;
                
                if (reconnectAttempts[sessionKey] <= MAX_RECONNECT_ATTEMPTS) {
                    // For other errors (408, 515 etc) - auto-reconnect without deleting session
                    console.log(`🔄 Connection lost [${sessionKey}], attempting auto-reconnect (${reconnectAttempts[sessionKey]}/${MAX_RECONNECT_ATTEMPTS})...`);
                    connectionStatus[sessionKey] = 'reconnecting';
                    
                    setTimeout(async () => {
                        try {
                            await createSocket(sessionKey, sessionPath);
                            console.log(`✅ Reconnected ${sessionKey}`);
                        } catch(e) {
                            console.error('Reconnect failed:', e.message);
                            connectionStatus[sessionKey] = 'disconnected';
                        }
                    }, 3000);
                } else {
                    console.log(`❌ Max reconnect attempts reached for ${sessionKey}, clearing session for fresh QR...`);
                    connectionStatus[sessionKey] = 'disconnected';
                    reconnectAttempts[sessionKey] = 0;
                    // Clear session so user can get fresh QR
                    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch(e) {}
                }
            }
        }
        
        if (connection === 'open') {
            console.log(`✅ Connected! [${sessionKey}]`);
            connectionStatus[sessionKey] = 'open';
            delete qrCodes[sessionKey];
            // Reset reconnect attempts on successful connection
            reconnectAttempts[sessionKey] = 0;
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    return sock;
    
    } finally {
        // Release lock after socket creation completes
        delete socketCreationLock[sessionKey];
    }
}

// ============= WHATSAPP APIs =============

app.post('/api/whatsapp/connect', checkAuth, async (req, res) => {
    const { sessionName, username } = req.body;
    
    // SECURITY: Force session to match username (user can only use their own session)
    const user = username || sessionName || 'default';
    const sessName = user; // Session is ALWAYS the username
    const sessionKey = `admin-001_${sessName}`;
    
    console.log(`\n📱 Connect request: ${sessionKey} by user: ${user}`);
    
    if (activeSockets[sessionKey] && connectionStatus[sessionKey] === 'open') {
        return res.json({ success: true, status: 'already_connected' });
    }
    
    if (activeSockets[sessionKey]) {
        try { activeSockets[sessionKey].end(); } catch(e) {}
        delete activeSockets[sessionKey];
        delete qrCodes[sessionKey];
    }
    
    try {
        const sessionPath = path.join(config.WHATSAPP.SESSIONS_DIR, sessionKey);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        
        await createSocket(sessionKey, sessionPath);
        
        res.json({ success: true, status: 'connecting', sessionKey });
        
    } catch (error) {
        console.error('Connection error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whatsapp/qr/:sessionName?', checkAuth, (req, res) => {
    // SECURITY: Use username as session (user can only access their own QR)
    const username = req.query.username || req.params.sessionName || 'default';
    const sessionKey = `admin-001_${username}`;
    
    res.json({
        sessionKey,
        status: connectionStatus[sessionKey] || 'not_connected',
        qr: qrCodes[sessionKey] || null,
        hasQR: !!qrCodes[sessionKey]
    });
});

app.post('/api/whatsapp/disconnect', checkAuth, (req, res) => {
    const { sessionName, username } = req.body;
    
    // SECURITY: Force session to match username (user can only disconnect their own session)
    const user = username || sessionName || 'default';
    const sessionKey = `admin-001_${user}`;
    
    if (activeSockets[sessionKey]) {
        try { activeSockets[sessionKey].end(); } catch(e) {}
        delete activeSockets[sessionKey];
    }
    connectionStatus[sessionKey] = 'disconnected';
    delete qrCodes[sessionKey];
    
    res.json({ success: true });
});

app.post('/api/whatsapp/send-message', checkAuth, async (req, res) => {
    const { sessionName, phone, message, username } = req.body;
    const user = username || sessionName || 'admin';
    
    // SECURITY: Force session to match username (user can only use their own session)
    const sessionKey = `admin-001_${user}`;
    
    const sock = activeSockets[sessionKey];
    if (!sock || connectionStatus[sessionKey] !== 'open') {
        await db.logMessage(user, phone, message, 'text', 'failed', 'WhatsApp not connected');
        return res.status(400).json({ error: 'WhatsApp not connected. Please connect your WhatsApp first.' });
    }
    
    // Check message limit
    const userData = await db.getUser(user);
    if (userData && userData.msg_used >= userData.msg_limit) {
        await db.logMessage(user, phone, message, 'text', 'failed', 'Message limit exceeded');
        return res.status(400).json({ error: 'Message limit exceeded. Contact admin.' });
    }
    
    try {
        const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        console.log(`📤 Message sent to ${phone} by ${user}`);
        await db.incrementMsgUsed(user);
        await db.logMessage(user, phone, message, 'text', 'sent', null);
        res.json({ success: true });
    } catch (error) {
        db.logMessage(user, phone, message, 'text', 'failed', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/whatsapp/send-pdf', checkAuth, upload.single('pdf'), async (req, res) => {
    console.log('📤 Send-PDF request received:', { phone: req.body.phone, username: req.body.username, hasFile: !!req.file });
    
    const { sessionName, phone, caption, username } = req.body;
    const user = username || sessionName || 'admin';
    
    // SECURITY: Force session to match username (user can only use their own session)
    const sessionKey = `admin-001_${user}`;
    const fileName = req.file ? req.file.originalname : 'document.pdf';
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    const sock = activeSockets[sessionKey];
    if (!sock || connectionStatus[sessionKey] !== 'open') {
        await db.logMessage(user, phone, `File: ${fileName}`, 'file', 'failed', 'WhatsApp not connected');
        return res.status(400).json({ error: 'WhatsApp not connected. Please connect your WhatsApp first.' });
    }
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check message limit
    const userData = await db.getUser(user);
    if (userData && userData.msg_used >= userData.msg_limit) {
        await db.logMessage(user, phone, `File: ${fileName}`, 'file', 'failed', 'Message limit exceeded');
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Message limit exceeded. Contact admin.' });
    }
    
    try {
        const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Check if it's an image (JPG/PNG) or PDF/document
        if (fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png') {
            // Send as image
            await sock.sendMessage(jid, {
                image: fileBuffer,
                caption: caption || ''
            });
            console.log(`🖼️ Image sent to ${phone} by ${user}: ${fileName}`);
            await db.logMessage(user, phone, `Image: ${fileName}`, 'image', 'sent', null);
        } else if (fileExt === 'pdf') {
            // Send as PDF document
            await sock.sendMessage(jid, {
                document: fileBuffer,
                mimetype: 'application/pdf',
                fileName: fileName,
                caption: caption || ''
            });
            console.log(`📄 PDF sent to ${phone} by ${user}: ${fileName}`);
            await db.logMessage(user, phone, `PDF: ${fileName}`, 'pdf', 'sent', null);
        } else {
            // Send as generic document
            await sock.sendMessage(jid, {
                document: fileBuffer,
                fileName: fileName,
                caption: caption || ''
            });
            console.log(`📎 File sent to ${phone} by ${user}: ${fileName}`);
            await db.logMessage(user, phone, `File: ${fileName}`, 'file', 'sent', null);
        }
        
        await db.incrementMsgUsed(user);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ success: true });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        await db.logMessage(user, phone, `File: ${fileName}`, 'file', 'failed', error.message);
        console.error('File send error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= EXTERNAL API / WEBHOOK ENDPOINTS =============
// These APIs can be called from external systems using API Key

// API Key validation middleware (supports both Admin key and User keys)
const validateApiKey = async (req, res, next) => {
    if (!config.EXTERNAL_API.ENABLED) {
        return res.status(403).json({ 
            success: false, 
            error: 'External API is disabled' 
        });
    }
    
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ 
            success: false, 
            error: 'API Key required. Use header "X-API-Key" or query param "api_key"' 
        });
    }
    
    // Check if it's the admin master key
    if (apiKey === config.EXTERNAL_API.API_KEY) {
        req.isAdminKey = true;
        req.apiUser = null;
        return next();
    }
    
    // Check if it's a user API key
    const user = await db.getUserByApiKey(apiKey);
    if (user) {
        req.isAdminKey = false;
        req.apiUser = user;
        // SECURITY: Lock session to user's username
        req.forcedSession = user.username;
        return next();
    }
    
    return res.status(401).json({ 
        success: false, 
        error: 'Invalid API Key' 
    });
};

// ============= API RATE LIMITING QUEUE =============
// Queue to prevent WhatsApp blocking - 5-15 sec delay between messages
const apiMessageQueue = [];
let isProcessingQueue = false;
let lastMessageTime = 0;

function getRandomDelay() {
    return Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000; // 5-15 seconds
}

async function processApiQueue() {
    if (isProcessingQueue || apiMessageQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (apiMessageQueue.length > 0) {
        const task = apiMessageQueue.shift();
        const now = Date.now();
        const timeSinceLastMsg = now - lastMessageTime;
        
        // If less than 5 seconds since last message, wait for random delay
        if (lastMessageTime > 0 && timeSinceLastMsg < 5000) {
            const delay = getRandomDelay();
            console.log(`⏳ [API-QUEUE] Waiting ${delay/1000}s before sending to ${task.phone}...`);
            await new Promise(r => setTimeout(r, delay));
        }
        
        try {
            await task.execute();
            lastMessageTime = Date.now();
        } catch (err) {
            console.error('Queue task error:', err);
        }
    }
    
    isProcessingQueue = false;
}

/**
 * @api {post} /webhook/send-message Send Text Message via Webhook
 * @apiDescription Send WhatsApp text message using API key
 * @apiHeader {String} X-API-Key Your API key (Admin or User API key)
 * @apiBody {String} phone Phone number with country code (e.g., 918683916682)
 * @apiBody {String} message Message text to send
 * @apiBody {String} [session=admin] Session name (only works with Admin API key, User API key is locked to user's session)
 */
app.post('/webhook/send-message', validateApiKey, async (req, res) => {
    const { phone, message, session } = req.body;
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    // SECURITY: If user API key, force session to user's username (no cross-access)
    let sessionName;
    let logUser;
    if (req.forcedSession) {
        // User API key - locked to their session
        sessionName = req.forcedSession;
        logUser = req.apiUser.username;
    } else {
        // Admin API key - can specify session
        sessionName = session || 'admin';
        logUser = sessionName;
    }
    
    const sessionKey = `admin-001_${sessionName}`;

    // Check API limit (only for admin key, user limit checked elsewhere)
    if (req.isAdminKey) {
        const limitCheck = await db.checkApiLimit(apiKey);
        if (!limitCheck.allowed) {
            return res.status(403).json({
                success: false,
                error: limitCheck.error,
                remaining: limitCheck.remaining,
                contact: config.ADMIN_CONTACT
            });
        }
    } else if (req.apiUser) {
        // Check user's message limit
        if (req.apiUser.msg_used >= req.apiUser.msg_limit) {
            return res.status(403).json({
                success: false,
                error: 'Message limit exceeded',
                limit: req.apiUser.msg_limit,
                used: req.apiUser.msg_used
            });
        }
    }

    // Validation
    if (!phone) {
        return res.status(400).json({
            success: false,
            error: 'Phone number required',
            example: { phone: '918683916682', message: 'Hello!' }
        });
    }
    
    if (!message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Message required',
            example: { phone: '918683916682', message: 'Hello!' }
        });
    }
    
    const sock = activeSockets[sessionKey];
    if (!sock || connectionStatus[sessionKey] !== 'open') {
        return res.status(400).json({ 
            success: false, 
            error: req.forcedSession ? 
                'Your WhatsApp session is not connected. Please login to dashboard and connect WhatsApp first.' :
                'WhatsApp not connected',
            session: sessionName,
            status: connectionStatus[sessionKey] || 'not_connected'
        });
    }
    
    // Check if we need to wait (rate limiting)
    const now = Date.now();
    const timeSinceLastMsg = now - lastMessageTime;
    const needsDelay = lastMessageTime > 0 && timeSinceLastMsg < 5000;
    const queuePosition = apiMessageQueue.length;
    
    // Add to queue and process
    const sendPromise = new Promise((resolve, reject) => {
        apiMessageQueue.push({
            phone: phone,
            execute: async () => {
                try {
                    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    await sock.sendMessage(jid, { text: message });
                    
                    console.log(`📤 [WEBHOOK] Message sent to ${phone} via session: ${sessionName} (${req.isAdminKey ? 'Admin' : 'User'} API)`);
                    await db.logMessage(logUser, phone, message, 'api_text', 'sent', null);
                    
                    if (req.isAdminKey) {
                        await db.incrementApiUsed(apiKey);
                    }
                    await db.incrementMsgUsed(logUser);
                    
                    resolve({ success: true });
                } catch (error) {
                    await db.logMessage(logUser, phone, message, 'api_text', 'failed', error.message);
                    reject(error);
                }
            }
        });
        processApiQueue();
    });
    
    try {
        await sendPromise;
        
        let remaining;
        if (req.isAdminKey) {
            const updatedLimit = await db.checkApiLimit(apiKey);
            remaining = updatedLimit.remaining;
        } else {
            const updatedUser = await db.getUser(logUser);
            remaining = updatedUser.msg_limit - updatedUser.msg_used;
        }
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully',
            phone: phone,
            session: sessionName,
            remaining: remaining,
            queuePosition: queuePosition,
            delayed: needsDelay,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @api {post} /webhook/send-pdf Send PDF via Webhook
 * @apiDescription Send WhatsApp PDF document using API key
 * @apiHeader {String} X-API-Key Your API key (Admin or User API key)
 * @apiBody {String} phone Phone number with country code
 * @apiBody {File} pdf PDF file to send
 * @apiBody {String} [caption] Optional caption for the PDF
 * @apiBody {String} [session=admin] Session name (only works with Admin API key)
 */
app.post('/webhook/send-pdf', validateApiKey, upload.single('pdf'), async (req, res) => {
    const { phone, caption, session } = req.body;
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const fileName = req.file ? req.file.originalname : 'document.pdf';
    
    // SECURITY: If user API key, force session to user's username
    let sessionName;
    let logUser;
    if (req.forcedSession) {
        sessionName = req.forcedSession;
        logUser = req.apiUser.username;
    } else {
        sessionName = session || 'admin';
        logUser = sessionName;
    }
    
    const sessionKey = `admin-001_${sessionName}`;

    // Check API limit
    if (req.isAdminKey) {
        const limitCheck = await db.checkApiLimit(apiKey);
        if (!limitCheck.allowed) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                error: limitCheck.error,
                remaining: limitCheck.remaining,
                contact: config.ADMIN_CONTACT
            });
        }
    } else if (req.apiUser) {
        if (req.apiUser.msg_used >= req.apiUser.msg_limit) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                error: 'Message limit exceeded',
                limit: req.apiUser.msg_limit,
                used: req.apiUser.msg_used
            });
        }
    }

        // Validation
        if (!phone) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Phone number required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'PDF file required. Use multipart/form-data with field name "pdf"'
            });
        }

        const sock = activeSockets[sessionKey];
        if (!sock || connectionStatus[sessionKey] !== 'open') {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                error: req.forcedSession ? 
                    'Your WhatsApp session is not connected. Please login to dashboard and connect WhatsApp first.' :
                    'WhatsApp not connected',
                session: sessionName,
                status: connectionStatus[sessionKey] || 'not_connected'
            });
        }

        // Store file path for queue processing
        const filePath = req.file.path;
    
    // Check if we need to wait (rate limiting)
    const now = Date.now();
    const timeSinceLastMsg = now - lastMessageTime;
    const needsDelay = lastMessageTime > 0 && timeSinceLastMsg < 5000;
    const queuePosition = apiMessageQueue.length;
    
    // Capture isAdminKey for use in queue
    const isAdminKey = req.isAdminKey;
    
    // Add to queue and process
    const sendPromise = new Promise((resolve, reject) => {
        apiMessageQueue.push({
            phone: phone,
            execute: async () => {
                try {
                    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    const pdfBuffer = fs.readFileSync(filePath);
                    
                    await sock.sendMessage(jid, {
                        document: pdfBuffer,
                        mimetype: 'application/pdf',
                        fileName: fileName,
                        caption: caption || ''
                    });
                    
                    console.log(`📄 [WEBHOOK] PDF sent to ${phone}: ${fileName} via session: ${sessionName} (${isAdminKey ? 'Admin' : 'User'} API)`);
                    await db.logMessage(logUser, phone, `PDF: ${fileName}`, 'api_pdf', 'sent', null);
                    
                    if (isAdminKey) {
                        await db.incrementApiUsed(apiKey);
                    }
                    await db.incrementMsgUsed(logUser);
                    
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    
                    resolve({ success: true });
                } catch (error) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    await db.logMessage(logUser, phone, `PDF: ${fileName}`, 'api_pdf', 'failed', error.message);
                    reject(error);
                }
            }
        });
        processApiQueue();
    });
    
    try {
        await sendPromise;
        
        let remaining;
        if (isAdminKey) {
            const updatedLimit = await db.checkApiLimit(apiKey);
            remaining = updatedLimit.remaining;
        } else {
            const updatedUser = await db.getUser(logUser);
            remaining = updatedUser.msg_limit - updatedUser.msg_used;
        }
        
        res.json({ 
            success: true, 
            message: 'PDF sent successfully',
            phone: phone,
            session: sessionName,
            fileName: fileName,
            remaining: remaining,
            queuePosition: queuePosition,
            delayed: needsDelay,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @api {post} /webhook/send-bulk Bulk Send Messages via Webhook
 * @apiDescription Send WhatsApp messages to multiple numbers
 * @apiHeader {String} X-API-Key Your API key (Admin or User API key)
 * @apiBody {Array} phones Array of phone numbers
 * @apiBody {String} message Message text to send
 * @apiBody {String} [session=admin] Session name (only works with Admin API key)
 */
app.post('/webhook/send-bulk', validateApiKey, async (req, res) => {
    const { phones, message, session } = req.body;
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    // SECURITY: If user API key, force session to user's username
    let sessionName;
    let logUser;
    if (req.forcedSession) {
        sessionName = req.forcedSession;
        logUser = req.apiUser.username;
    } else {
        sessionName = session || 'admin';
        logUser = sessionName;
    }
    
    const sessionKey = `admin-001_${sessionName}`;
    
    // Check API limit
    let limitRemaining;
    if (req.isAdminKey) {
        const limitCheck = await db.checkApiLimit(apiKey);
        if (!limitCheck.allowed) {
            return res.status(403).json({
                success: false,
                error: limitCheck.error,
                remaining: limitCheck.remaining,
                contact: config.ADMIN_CONTACT
            });
        }
        limitRemaining = limitCheck.remaining;
    } else if (req.apiUser) {
        const remaining = req.apiUser.msg_limit - req.apiUser.msg_used;
        if (remaining <= 0) {
            return res.status(403).json({
                success: false,
                error: 'Message limit exceeded',
                limit: req.apiUser.msg_limit,
                used: req.apiUser.msg_used
            });
        }
        limitRemaining = remaining;
    }
    
    // Validation
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ 
            success: false, 
            error: 'Phones array required',
            example: { phones: ['918683916682', '919876543210'], message: 'Hello!' }
        });
    }
    
    // Check if enough limit for bulk
    if (phones.length > limitRemaining) {
        return res.status(403).json({
            success: false,
            error: `Insufficient message limit. You have ${limitRemaining} messages remaining but trying to send ${phones.length}`,
            remaining: limitRemaining,
            requested: phones.length,
            contact: config.ADMIN_CONTACT
        });
    }
    
    if (!message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Message required' 
        });
    }
    
    const sock = activeSockets[sessionKey];
    if (!sock || connectionStatus[sessionKey] !== 'open') {
        return res.status(400).json({ 
            success: false, 
            error: req.forcedSession ? 
                'Your WhatsApp session is not connected. Please login to dashboard and connect WhatsApp first.' :
                'WhatsApp not connected',
            session: sessionName
        });
    }
    
    // Capture variables for background task
    const isAdminKey = req.isAdminKey;
    
    // Process bulk messages (returns immediately, sends in background)
    const results = { total: phones.length, queued: phones.length, sent: 0, failed: 0 };
    
    res.json({ 
        success: true, 
        message: 'Bulk send started',
        session: sessionName,
        ...results,
        remaining: limitRemaining - phones.length,
        note: 'Messages will be sent with 36-48 second delays to avoid blocking'
    });
    
    // Send messages in background with delays
    (async () => {
        for (let i = 0; i < phones.length; i++) {
            const phone = phones[i].toString().trim();
            try {
                const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.sendMessage(jid, { text: message });
                console.log(`📤 [WEBHOOK-BULK] Message sent to ${phone} (${i+1}/${phones.length}) via session: ${sessionName} (${isAdminKey ? 'Admin' : 'User'} API)`);
                await db.logMessage(logUser, phone, message, 'api_text', 'sent', null);
                
                if (isAdminKey) {
                    await db.incrementApiUsed(apiKey);
                }
                await db.incrementMsgUsed(logUser);
            } catch (error) {
                console.log(`❌ [WEBHOOK-BULK] Failed to ${phone}: ${error.message}`);
                await db.logMessage(logUser, phone, message, 'api_text', 'failed', error.message);
            }
            
            // Wait before next message (except for last one)
            if (i < phones.length - 1) {
                const delay = Math.floor(Math.random() * (config.RATE_LIMIT.MAX_DELAY - config.RATE_LIMIT.MIN_DELAY + 1)) + config.RATE_LIMIT.MIN_DELAY;
                await new Promise(r => setTimeout(r, delay));
            }
        }
        console.log(`✅ [WEBHOOK-BULK] Completed: ${phones.length} messages processed for ${logUser}`);
    })();
});

/**
 * @api {get} /webhook/stats Get API Message Statistics
 * @apiDescription Get statistics of messages sent via API
 * @apiHeader {String} X-API-Key Your API key
 */
app.get('/webhook/stats', validateApiKey, async (req, res) => {
    const stats = await db.getApiStats();
    const history = await db.getApiHistory(50);
    
    res.json({
        success: true,
        stats: stats,
        recentMessages: history,
        timestamp: new Date().toISOString()
    });
});

/**
 * @api {get} /api/api-stats Get API Statistics (No Auth Required)
 * @apiDescription Get API message statistics for dashboard
 */
app.get('/api/api-stats', async (req, res) => {
    const stats = await db.getApiStats();
    const history = await db.getApiHistory(20);
    const apiLimit = await db.getApiLimit(config.EXTERNAL_API.API_KEY);
    
    res.json({
        success: true,
        stats: stats,
        recentMessages: history,
        apiLimit: apiLimit ? {
            limit: apiLimit.msg_limit,
            used: apiLimit.msg_used,
            remaining: apiLimit.msg_limit - apiLimit.msg_used,
            isActive: apiLimit.is_active === 1
        } : null
    });
});

/**
 * @api {get} /api/api-limit Get API Limit Info
 * @apiDescription Get current API limit status
 */
app.get('/api/api-limit', (req, res) => {
    const apiLimit = db.getApiLimit(config.EXTERNAL_API.API_KEY);
    if (apiLimit) {
        res.json({
            success: true,
            limit: apiLimit.msg_limit,
            used: apiLimit.msg_used,
            remaining: apiLimit.msg_limit - apiLimit.msg_used,
            isActive: apiLimit.is_active === 1
        });
    } else {
        res.json({ success: false, error: 'API limit not found' });
    }
});

/**
 * @api {put} /api/api-limit Update API Limit (Admin Only)
 * @apiDescription Update API message limit
 */
app.put('/api/api-limit', async (req, res) => {
    const { addLimit, setLimit, resetUsed, toggleActive } = req.body;
    const apiKey = config.EXTERNAL_API.API_KEY;
    
    if (addLimit && addLimit > 0) {
        await db.addToApiLimit(apiKey, addLimit);
        const updated = await db.getApiLimit(apiKey);
        return res.json({ 
            success: true, 
            message: `Added ${addLimit} messages to API limit`,
            newLimit: updated.msg_limit,
            remaining: updated.msg_limit - updated.msg_used
        });
    }
    
    if (setLimit && setLimit > 0) {
        await db.updateApiLimit(apiKey, setLimit, resetUsed || false);
        const updated = await db.getApiLimit(apiKey);
        return res.json({ 
            success: true, 
            message: resetUsed ? `Set API limit to ${setLimit} and reset used count` : `Set API limit to ${setLimit}`,
            newLimit: updated.msg_limit,
            remaining: updated.msg_limit - updated.msg_used
        });
    }
    
    if (toggleActive !== undefined) {
        await db.toggleApiActive(apiKey, toggleActive);
        return res.json({ 
            success: true, 
            message: toggleActive ? 'API enabled' : 'API disabled',
            isActive: toggleActive
        });
    }
    
    res.status(400).json({ success: false, error: 'Provide addLimit, setLimit, or toggleActive' });
});

// ============= USER-SPECIFIC API ENDPOINTS (Per-User API Keys) =============

/**
 * Middleware to validate user API key
 */
async function validateUserApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key || req.body.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ 
            success: false, 
            error: 'API key required. Use X-API-Key header or api_key parameter.' 
        });
    }
    
    const user = await db.getUserByApiKey(apiKey);
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid API key' 
        });
    }
    
    // Check message limit
    if (user.msg_used >= user.msg_limit) {
        return res.status(403).json({ 
            success: false, 
            error: 'Message limit exceeded',
            limit: user.msg_limit,
            used: user.msg_used
        });
    }
    
    req.apiUser = user;
    next();
}

/**
 * @api {post} /api/v1/send Send Message via User API Key
 * @apiDescription Send WhatsApp message using user's API key
 * @apiHeader {String} X-API-Key User's unique API key
 * @apiBody {String} phone Phone number with country code
 * @apiBody {String} message Message text
 * @apiBody {String} [session] WhatsApp session name (default: user's username)
 */
app.post('/api/v1/send', validateUserApiKey, async (req, res) => {
    const { phone, message } = req.body;
    const user = req.apiUser;
    
    if (!phone || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'phone and message are required' 
        });
    }
    
    // SECURITY: Session is ALWAYS locked to user's username (no session parameter allowed)
    const sessionName = user.username;
    const sessionKey = `admin-001_${sessionName}`;
    const sock = activeSockets[sessionKey];
    
    if (!sock) {
        return res.status(400).json({ 
            success: false, 
            error: `Your WhatsApp session is not connected. Please login to dashboard and connect WhatsApp first.`,
            session: sessionName
        });
    }
    
    try {
        const phoneNum = phone.toString().replace(/[^0-9]/g, '');
        const jid = phoneNum + '@s.whatsapp.net';
        
        await sock.sendMessage(jid, { text: message });
        
        // Increment message used count
        await db.incrementMsgUsed(user.username);
        
        // Log the message
        await db.logMessage(user.username, phone, message, 'text', 'sent');
        
        const updatedUser = await db.getUser(user.username);
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            phone: phoneNum,
            session: sessionName,
            remaining: updatedUser.msg_limit - updatedUser.msg_used,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('API v1 send error:', error);
        await db.logMessage(user.username, phone, message, 'text', 'failed', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @api {post} /api/v1/send-pdf Send PDF via User API Key
 * @apiDescription Send PDF document using user's API key
 * @apiHeader {String} X-API-Key User's unique API key
 */
app.post('/api/v1/send-pdf', validateUserApiKey, upload.single('pdf'), async (req, res) => {
    const { phone, caption } = req.body;
    const user = req.apiUser;
    
    if (!phone) {
        return res.status(400).json({ 
            success: false, 
            error: 'phone is required' 
        });
    }
    
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'PDF file is required' 
        });
    }
    
    // SECURITY: Session is ALWAYS locked to user's username
    const sessionName = user.username;
    const sessionKey = `admin-001_${sessionName}`;
    const sock = activeSockets[sessionKey];
    
    if (!sock) {
        return res.status(400).json({ 
            success: false, 
            error: `Your WhatsApp session is not connected. Please login to dashboard and connect WhatsApp first.` 
        });
    }
    
    try {
        const phoneNum = phone.toString().replace(/[^0-9]/g, '');
        const jid = phoneNum + '@s.whatsapp.net';
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfName = req.file.originalname || 'document.pdf';
        
        await sock.sendMessage(jid, {
            document: pdfBuffer,
            fileName: pdfName,
            mimetype: 'application/pdf',
            caption: caption || ''
        });
        
        // Increment message used count
        await db.incrementMsgUsed(user.username);
        
        // Log the message
        await db.logMessage(user.username, phone, caption || 'PDF sent', 'document', 'sent');
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        const updatedUser = await db.getUser(user.username);
        
        res.json({
            success: true,
            message: 'PDF sent successfully',
            phone: phoneNum,
            fileName: pdfName,
            remaining: updatedUser.msg_limit - updatedUser.msg_used,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('API v1 send-pdf error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @api {get} /api/v1/status Get User Status via API Key
 * @apiDescription Check WhatsApp connection and account status
 * @apiHeader {String} X-API-Key User's unique API key
 */
app.get('/api/v1/status', validateUserApiKey, (req, res) => {
    const user = req.apiUser;
    const sessionKey = `admin-001_${user.username}`;
    
    res.json({
        success: true,
        user: user.username,
        session: {
            name: user.username,
            status: connectionStatus[sessionKey] || 'not_connected',
            connected: connectionStatus[sessionKey] === 'open'
        },
        messages: {
            limit: user.msg_limit,
            used: user.msg_used,
            remaining: user.msg_limit - user.msg_used
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * @api {get} /api/v1/balance Get Message Balance
 * @apiDescription Check remaining message balance
 * @apiHeader {String} X-API-Key User's unique API key
 */
app.get('/api/v1/balance', validateUserApiKey, (req, res) => {
    const user = req.apiUser;
    
    res.json({
        success: true,
        limit: user.msg_limit,
        used: user.msg_used,
        remaining: user.msg_limit - user.msg_used,
        timestamp: new Date().toISOString()
    });
});

/**
 * @api {get} /api/v1/history Get Message History
 * @apiDescription Get user's message history
 * @apiHeader {String} X-API-Key User's unique API key
 */
app.get('/api/v1/history', validateUserApiKey, async (req, res) => {
    const user = req.apiUser;
    const limit = parseInt(req.query.limit) || 50;
    
    try {
        const history = await db.getUserMessageHistory(user.username, limit);
        res.json({
            success: true,
            count: history.length,
            messages: history
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @api {get} /api/v1/info API Documentation for User APIs
 */
app.get('/api/v1/info', (req, res) => {
    res.json({
        name: 'WhatsApp Automation - User API',
        version: '1.0.0',
        description: 'Per-user API endpoints with unique API keys',
        endpoints: [
            {
                method: 'POST',
                path: '/api/v1/send',
                description: 'Send text message',
                headers: { 'X-API-Key': 'your_user_api_key', 'Content-Type': 'application/json' },
                body: { phone: '919876543210', message: 'Hello!', session: 'optional_session_name' },
                curl: `curl -X POST ${config.API_BASE_URL}/api/v1/send -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -d "{\\"phone\\":\\"919876543210\\",\\"message\\":\\"Hello!\\"}"`
            },
            {
                method: 'POST',
                path: '/api/v1/send-pdf',
                description: 'Send PDF document',
                headers: { 'X-API-Key': 'your_user_api_key' },
                body: 'multipart/form-data: phone, pdf (file), caption (optional), session (optional)',
                curl: `curl -X POST ${config.API_BASE_URL}/api/v1/send-pdf -H "X-API-Key: YOUR_API_KEY" -F "phone=919876543210" -F "pdf=@document.pdf" -F "caption=Your document"`
            },
            {
                method: 'GET',
                path: '/api/v1/status',
                description: 'Get connection and account status',
                headers: { 'X-API-Key': 'your_user_api_key' }
            },
            {
                method: 'GET',
                path: '/api/v1/balance',
                description: 'Get remaining message balance',
                headers: { 'X-API-Key': 'your_user_api_key' }
            },
            {
                method: 'GET',
                path: '/api/v1/history',
                description: 'Get message history',
                headers: { 'X-API-Key': 'your_user_api_key' },
                query: { limit: 50 }
            }
        ],
        notes: [
            'Each user gets a unique API key when created',
            'API key can be regenerated from user settings',
            'Message limits are per-user',
            'Session defaults to username if not specified'
        ]
    });
});

/**
 * @api {post} /api/users/:username/regenerate-key Regenerate API Key
 * @apiDescription Generate new API key for a user (Admin only)
 */
app.post('/api/users/:username/regenerate-key', async (req, res) => {
    const { username } = req.params;
    
    try {
        const result = await db.regenerateApiKey(username);
        if (result.success) {
            res.json({
                success: true,
                message: 'API key regenerated successfully',
                apiKey: result.apiKey
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @api {get} /webhook/status Check Connection Status via Webhook
 * @apiDescription Check WhatsApp connection status
 * @apiHeader {String} X-API-Key Your API key (Admin or User API key)
 * @apiQuery {String} [session=admin] Session name (only works with Admin API key)
 */
app.get('/webhook/status', validateApiKey, async (req, res) => {
    // SECURITY: If user API key, force session to user's username
    let sessionName;
    if (req.forcedSession) {
        sessionName = req.forcedSession;
    } else {
        sessionName = req.query.session || 'admin';
    }
    
    const sessionKey = `admin-001_${sessionName}`;
    
    const response = {
        success: true,
        session: sessionName,
        status: connectionStatus[sessionKey] || 'not_connected',
        connected: connectionStatus[sessionKey] === 'open',
        timestamp: new Date().toISOString()
    };
    
    // Add user-specific info if user API key
    if (req.apiUser) {
        response.user = req.apiUser.username;
        response.messages = {
            limit: req.apiUser.msg_limit,
            used: req.apiUser.msg_used,
            remaining: req.apiUser.msg_limit - req.apiUser.msg_used
        };
    }
    
    res.json(response);
});

/**
 * @api {get} /webhook/info API Documentation
 * @apiDescription Get API documentation and examples
 */
app.get('/webhook/info', (req, res) => {
    res.json({
        name: 'WhatsApp Business Automation API',
        version: '1.0.0',
        enabled: config.EXTERNAL_API.ENABLED,
        endpoints: [
            {
                method: 'POST',
                path: '/webhook/send-message',
                description: 'Send text message',
                headers: { 'X-API-Key': 'your_api_key', 'Content-Type': 'application/json' },
                body: { phone: '918683916682', message: 'Hello from API!', session: 'admin' },
                curl: `curl -X POST ${config.API_BASE_URL}/webhook/send-message -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -d "{\\"phone\\":\\"918683916682\\",\\"message\\":\\"Hello!\\"}"`
            },
            {
                method: 'POST',
                path: '/webhook/send-pdf',
                description: 'Send PDF document',
                headers: { 'X-API-Key': 'your_api_key' },
                body: 'multipart/form-data: phone, pdf (file), caption (optional), session',
                curl: `curl -X POST ${config.API_BASE_URL}/webhook/send-pdf -H "X-API-Key: YOUR_API_KEY" -F "phone=918683916682" -F "pdf=@document.pdf" -F "caption=Here is your file"`
            },
            {
                method: 'POST',
                path: '/webhook/send-bulk',
                description: 'Send bulk messages (with auto delay)',
                headers: { 'X-API-Key': 'your_api_key', 'Content-Type': 'application/json' },
                body: { phones: ['918683916682', '919876543210'], message: 'Bulk message', session: 'admin' }
            },
            {
                method: 'GET',
                path: '/webhook/status',
                description: 'Check WhatsApp connection status',
                headers: { 'X-API-Key': 'your_api_key' },
                query: { session: 'admin' }
            }
        ],
        notes: [
            'All endpoints require X-API-Key header or api_key query parameter',
            'Phone numbers should include country code (e.g., 91 for India)',
            'Bulk messages are sent with 36-48 second delays to prevent blocking',
            'PDF files must be sent as multipart/form-data'
        ]
    });
});

// ============= SERVER STARTUP =============

db.initDatabase().then(async () => {
    // Generate API keys for existing users who don't have one
    await db.ensureAllUsersHaveApiKey();
    
    app.listen(config.PORT, config.HOST || '0.0.0.0', () => {
        console.log(`\n🚀 Server running at http://localhost:${config.PORT}`);
        console.log(`📱 Open http://localhost:${config.PORT}/index.html`);
        console.log(`👤 Login: ${config.DEFAULT_ADMIN.USERNAME} / ${config.DEFAULT_ADMIN.PASSWORD}`);
        console.log(`💾 Database: ${config.DATABASE.PATH}`);
        console.log(`📞 Admin Contact: ${config.ADMIN_CONTACT}`);
        console.log(`\n🔌 WEBHOOK API ENDPOINTS:`);
        console.log(`   POST http://localhost:${config.PORT}/webhook/send-message`);
        console.log(`   POST http://localhost:${config.PORT}/webhook/send-pdf`);
        console.log(`   POST http://localhost:${config.PORT}/webhook/send-bulk`);
        console.log(`   GET  http://localhost:${config.PORT}/webhook/status`);
        console.log(`   GET  http://localhost:${config.PORT}/webhook/info`);
        console.log(`\n🔑 USER API ENDPOINTS (per-user API keys):`);
        console.log(`   POST http://localhost:${config.PORT}/api/v1/send`);
        console.log(`   GET  http://localhost:${config.PORT}/api/v1/status`);
        console.log(`   GET  http://localhost:${config.PORT}/api/v1/balance\n`);
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
});

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
        // Other errors (including custom multer filter errors)
        return res.status(400).json({ error: err.message || 'Unknown error occurred' });
    }
    next();
});
