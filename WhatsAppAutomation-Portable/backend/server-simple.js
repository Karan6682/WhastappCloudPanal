/**
 * WhatsApp Business Automation Server
 * Clean architecture with centralized config and database
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');

// Import centralized modules
const config = require('./config');
const db = require('./db');

const app = express();

// Multer setup for PDF upload
const upload = multer({ 
    dest: config.UPLOAD.DIR,
    limits: { fileSize: config.UPLOAD.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files allowed'));
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

// ============= AUTH APIs =============

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
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
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
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const existingUser = await db.getUser(username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const permissions = menuPermissions || 'dashboard,messages,documents,bulk,connection,sessions,settings';
        await db.createUser(username, password, msgLimit || 100, permissions);
        res.json({ success: true });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Server error' });
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

async function createSocket(sessionKey, sessionPath) {
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
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined
    });
    
    activeSockets[sessionKey] = sock;
    connectionStatus[sessionKey] = 'connecting';
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`🔲 QR generated for ${sessionKey}`);
            qrCodes[sessionKey] = qr;
            connectionStatus[sessionKey] = 'qr_ready';
        }
        
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut && code !== 401;
            
            console.log(`❌ Disconnected [${sessionKey}]: ${code}, reconnect: ${shouldReconnect}`);
            
            if (shouldReconnect && code === 515) {
                console.log(`🔄 Auto-reconnecting ${sessionKey} in ${config.WHATSAPP.RECONNECT_INTERVAL/1000}s...`);
                delete activeSockets[sessionKey];
                delete qrCodes[sessionKey];
                connectionStatus[sessionKey] = 'reconnecting';
                
                setTimeout(async () => {
                    try {
                        await createSocket(sessionKey, sessionPath);
                    } catch(e) {
                        console.error('Reconnect failed:', e.message);
                        connectionStatus[sessionKey] = 'disconnected';
                    }
                }, config.WHATSAPP.RECONNECT_INTERVAL);
            } else {
                connectionStatus[sessionKey] = 'disconnected';
                delete qrCodes[sessionKey];
                delete activeSockets[sessionKey];
                
                if (code === DisconnectReason.loggedOut) {
                    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch(e) {}
                }
            }
        }
        
        if (connection === 'open') {
            console.log(`✅ Connected! [${sessionKey}]`);
            connectionStatus[sessionKey] = 'open';
            delete qrCodes[sessionKey];
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    return sock;
}

// ============= WHATSAPP APIs =============

app.post('/api/whatsapp/connect', checkAuth, async (req, res) => {
    const { sessionName } = req.body;
    const sessName = sessionName || 'default';
    const sessionKey = `admin-001_${sessName}`;
    
    console.log(`\n📱 Connect request: ${sessionKey}`);
    
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
    const sessionName = req.params.sessionName || 'default';
    const sessionKey = `admin-001_${sessionName}`;
    
    res.json({
        sessionKey,
        status: connectionStatus[sessionKey] || 'not_connected',
        qr: qrCodes[sessionKey] || null,
        hasQR: !!qrCodes[sessionKey]
    });
});

app.post('/api/whatsapp/disconnect', checkAuth, (req, res) => {
    const { sessionName } = req.body;
    const sessionKey = `admin-001_${sessionName || 'default'}`;
    
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
    const sessionKey = `admin-001_${sessionName || 'default'}`;
    const user = username || sessionName || 'admin';
    
    const sock = activeSockets[sessionKey];
    if (!sock || connectionStatus[sessionKey] !== 'open') {
        db.logMessage(user, phone, message, 'text', 'failed', 'WhatsApp not connected');
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    // Check message limit
    const userData = db.getUser(user);
    if (userData && userData.msg_used >= userData.msg_limit) {
        db.logMessage(user, phone, message, 'text', 'failed', 'Message limit exceeded');
        return res.status(400).json({ error: 'Message limit exceeded. Contact admin.' });
    }
    
    try {
        const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        console.log(`📤 Message sent to ${phone} by ${user}`);
        db.incrementMsgUsed(user);
        db.logMessage(user, phone, message, 'text', 'sent', null);
        res.json({ success: true });
    } catch (error) {
        db.logMessage(user, phone, message, 'text', 'failed', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/whatsapp/send-pdf', checkAuth, upload.single('pdf'), async (req, res) => {
    const { sessionName, phone, caption, username } = req.body;
    const sessionKey = `admin-001_${sessionName || 'default'}`;
    const user = username || sessionName || 'admin';
    const fileName = req.file ? req.file.originalname : 'document.pdf';
    
    const sock = activeSockets[sessionKey];
    if (!sock || connectionStatus[sessionKey] !== 'open') {
        db.logMessage(user, phone, `PDF: ${fileName}`, 'pdf', 'failed', 'WhatsApp not connected');
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    // Check message limit
    const userData = db.getUser(user);
    if (userData && userData.msg_used >= userData.msg_limit) {
        db.logMessage(user, phone, `PDF: ${fileName}`, 'pdf', 'failed', 'Message limit exceeded');
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Message limit exceeded. Contact admin.' });
    }
    
    try {
        const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const pdfBuffer = fs.readFileSync(req.file.path);
        
        await sock.sendMessage(jid, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: fileName,
            caption: caption || ''
        });
        
        console.log(`📄 PDF sent to ${phone} by ${user}: ${fileName}`);
        db.incrementMsgUsed(user);
        db.logMessage(user, phone, `PDF: ${fileName}`, 'pdf', 'sent', null);
        
        fs.unlinkSync(req.file.path);
        
        res.json({ success: true });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        db.logMessage(user, phone, `PDF: ${fileName}`, 'pdf', 'failed', error.message);
        console.error('PDF send error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= EXTERNAL API / WEBHOOK ENDPOINTS =============
// These APIs can be called from external systems using API Key

// API Key validation middleware
const validateApiKey = (req, res, next) => {
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
    
    if (apiKey !== config.EXTERNAL_API.API_KEY) {
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid API Key' 
        });
    }
    
    next();
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
 * @apiHeader {String} X-API-Key Your API key
 * @apiBody {String} phone Phone number with country code (e.g., 918683916682)
 * @apiBody {String} message Message text to send
 * @apiBody {String} [session=admin] Session name (optional)
 */
app.post('/webhook/send-message', validateApiKey, async (req, res) => {
    const { phone, message, session } = req.body;
    const sessionName = session || 'admin';
    const sessionKey = `admin-001_${sessionName}`;
    const apiKey = req.headers['x-api-key'];

    // Check API limit
    const limitCheck = await db.checkApiLimit(apiKey);
    if (!limitCheck.allowed) {
        return res.status(403).json({
            success: false,
            error: limitCheck.error,
            remaining: limitCheck.remaining,
            contact: config.ADMIN_CONTACT
        });
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
            error: 'WhatsApp not connected',
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
                    
                    console.log(`📤 [WEBHOOK] Message sent to ${phone} via session: ${sessionName}`);
                    await db.logMessage(sessionName, phone, message, 'api_text', 'sent', null);
                    await db.incrementApiUsed(apiKey);
                    await db.incrementMsgUsed(sessionName);
                    
                    resolve({ success: true });
                } catch (error) {
                    await db.logMessage(sessionName, phone, message, 'api_text', 'failed', error.message);
                    reject(error);
                }
            }
        });
        processApiQueue();
    });
    
    try {
        await sendPromise;
        const updatedLimit = await db.checkApiLimit(apiKey);
        res.json({ 
            success: true, 
            message: 'Message sent successfully',
            phone: phone,
            remaining: updatedLimit.remaining,
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
 * @apiHeader {String} X-API-Key Your API key
 * @apiBody {String} phone Phone number with country code
 * @apiBody {File} pdf PDF file to send
 * @apiBody {String} [caption] Optional caption for the PDF
 * @apiBody {String} [session=admin] Session name (optional)
 */
app.post('/webhook/send-pdf', validateApiKey, upload.single('pdf'), async (req, res) => {
    const { phone, caption, session } = req.body;
    const sessionName = session || 'admin';
    const sessionKey = `admin-001_${sessionName}`;
    const fileName = req.file ? req.file.originalname : 'document.pdf';
    const apiKey = req.headers['x-api-key'];

    // Check API limit
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
                error: 'WhatsApp not connected',
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
                    
                    console.log(`📄 [WEBHOOK] PDF sent to ${phone}: ${fileName} via session: ${sessionName}`);
                    await db.logMessage(sessionName, phone, `PDF: ${fileName}`, 'api_pdf', 'sent', null);
                    await db.incrementApiUsed(apiKey);
                    await db.incrementMsgUsed(sessionName);
                    
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    
                    resolve({ success: true });
                } catch (error) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    await db.logMessage(sessionName, phone, `PDF: ${fileName}`, 'api_pdf', 'failed', error.message);
                    reject(error);
                }
            }
        });
        processApiQueue();
    });
    
    try {
        await sendPromise;
        const updatedLimit = await db.checkApiLimit(apiKey);
        res.json({ 
            success: true, 
            message: 'PDF sent successfully',
            phone: phone,
            fileName: fileName,
            remaining: updatedLimit.remaining,
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
 * @apiHeader {String} X-API-Key Your API key
 * @apiBody {Array} phones Array of phone numbers
 * @apiBody {String} message Message text to send
 * @apiBody {String} [session=admin] Session name (optional)
 */
app.post('/webhook/send-bulk', validateApiKey, async (req, res) => {
    const { phones, message, session } = req.body;
    const sessionName = session || 'admin';
    const sessionKey = `admin-001_${sessionName}`;
    const apiKey = req.headers['x-api-key'];
    
    // Check API limit
    const limitCheck = await db.checkApiLimit(apiKey);
    if (!limitCheck.allowed) {
        return res.status(403).json({
            success: false,
            error: limitCheck.error,
            remaining: limitCheck.remaining,
            contact: config.ADMIN_CONTACT
        });
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
    if (phones.length > limitCheck.remaining) {
        return res.status(403).json({
            success: false,
            error: `Insufficient API limit. You have ${limitCheck.remaining} messages remaining but trying to send ${phones.length}`,
            remaining: limitCheck.remaining,
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
            error: 'WhatsApp not connected' 
        });
    }
    
    // Process bulk messages (returns immediately, sends in background)
    const results = { total: phones.length, queued: phones.length, sent: 0, failed: 0 };
    
    res.json({ 
        success: true, 
        message: 'Bulk send started',
        ...results,
        remaining: limitCheck.remaining - phones.length,
        note: 'Messages will be sent with 36-48 second delays to avoid blocking'
    });
    
    // Send messages in background with delays
    (async () => {
        for (let i = 0; i < phones.length; i++) {
            const phone = phones[i].toString().trim();
            try {
                const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.sendMessage(jid, { text: message });
                console.log(`📤 [WEBHOOK-BULK] Message sent to ${phone} (${i+1}/${phones.length}) via session: ${sessionName}`);
                await db.logMessage(sessionName, phone, message, 'api_text', 'sent', null);
                await db.incrementApiUsed(apiKey);
                await db.incrementMsgUsed(sessionName);
            } catch (error) {
                console.log(`❌ [WEBHOOK-BULK] Failed to ${phone}: ${error.message}`);
                await db.logMessage(sessionName, phone, message, 'api_text', 'failed', error.message);
            }
            
            // Wait before next message (except for last one)
            if (i < phones.length - 1) {
                const delay = Math.floor(Math.random() * (config.RATE_LIMIT.MAX_DELAY - config.RATE_LIMIT.MIN_DELAY + 1)) + config.RATE_LIMIT.MIN_DELAY;
                await new Promise(r => setTimeout(r, delay));
            }
        }
        console.log(`✅ [WEBHOOK-BULK] Completed: ${phones.length} messages processed`);
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

/**
 * @api {get} /webhook/status Check Connection Status via Webhook
 * @apiDescription Check WhatsApp connection status
 * @apiHeader {String} X-API-Key Your API key
 * @apiQuery {String} [session=admin] Session name
 */
app.get('/webhook/status', validateApiKey, (req, res) => {
    const sessionName = req.query.session || 'admin';
    const sessionKey = `admin-001_${sessionName}`;
    
    res.json({
        success: true,
        session: sessionName,
        status: connectionStatus[sessionKey] || 'not_connected',
        connected: connectionStatus[sessionKey] === 'open',
        timestamp: new Date().toISOString()
    });
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

db.initDatabase().then(() => {
    app.listen(config.PORT, () => {
        console.log(`\n🚀 Server running at ${config.API_BASE_URL}`);
        console.log(`📱 Open ${config.API_BASE_URL}/app.html`);
        console.log(`👤 Login: ${config.DEFAULT_ADMIN.USERNAME} / ${config.DEFAULT_ADMIN.PASSWORD}`);
        console.log(`💾 Database: ${config.DATABASE.PATH}`);
        console.log(`📞 Admin Contact: ${config.ADMIN_CONTACT}`);
        console.log(`\n🔌 WEBHOOK API ENDPOINTS:`);
        console.log(`   POST ${config.API_BASE_URL}/webhook/send-message`);
        console.log(`   POST ${config.API_BASE_URL}/webhook/send-pdf`);
        console.log(`   POST ${config.API_BASE_URL}/webhook/send-bulk`);
        console.log(`   GET  ${config.API_BASE_URL}/webhook/status`);
        console.log(`   GET  ${config.API_BASE_URL}/webhook/info`);
        console.log(`   🔑 API Key: ${config.EXTERNAL_API.API_KEY}\n`);
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err);
});
