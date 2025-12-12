const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../../whatsapp.db');
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) console.error('Database connection error:', err);
      else console.log('✅ SQLite Database connected');
    });
    this.initializeTables();
  }

  initializeTables() {
    // Users/Clients table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        whatsapp_phone TEXT,
        whatsapp_connected INTEGER DEFAULT 0,
        whatsapp_session TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User Settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        msg_delay_seconds INTEGER DEFAULT 5,
        batch_size INTEGER DEFAULT 100,
        prevent_blocking BOOLEAN DEFAULT 1,
        rate_limit_per_minute INTEGER DEFAULT 30,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Templates table (user-specific)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        placeholders TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Contacts table (user-specific)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        custom_fields TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Campaigns table (user-specific)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        total_contacts INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        use_random_templates BOOLEAN DEFAULT 0,
        template_ids TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Logs table (user-specific)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        campaign_id TEXT,
        phone TEXT,
        status TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      )
    `);

    // QR Sessions table (for storing WhatsApp sessions per user)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS qr_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        qr_code TEXT,
        session_data TEXT,
        status TEXT DEFAULT 'waiting',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('📊 All database tables initialized');
  }

  // ==================== USER OPERATIONS ====================

  createUser(username, email, passwordHash) {
    return new Promise((resolve, reject) => {
      const userId = uuidv4();
      const query = `
        INSERT INTO users (id, username, email, password_hash)
        VALUES (?, ?, ?, ?)
      `;
      this.db.run(query, [userId, username, email, passwordHash], function(err) {
        if (err) reject(err);
        else {
          // Create default settings for user
          const settingId = uuidv4();
          const settingQuery = `
            INSERT INTO user_settings (id, user_id)
            VALUES (?, ?)
          `;
          this.db.run(settingQuery, [settingId, userId], (err) => {
            if (err) reject(err);
            else resolve({ id: userId, username, email });
          });
        }
      });
    });
  }

  getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE username = ?`;
      this.db.get(query, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getUserById(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE id = ?`;
      this.db.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  updateUserWhatsAppSession(userId, phone, sessionData) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE users 
        SET whatsapp_phone = ?, whatsapp_session = ?, whatsapp_connected = 1
        WHERE id = ?
      `;
      this.db.run(query, [phone, sessionData, userId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  // ==================== SETTINGS OPERATIONS ====================

  getUserSettings(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM user_settings WHERE user_id = ?`;
      this.db.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || {
          msg_delay_seconds: 5,
          batch_size: 100,
          prevent_blocking: true,
          rate_limit_per_minute: 30
        });
      });
    });
  }

  updateUserSettings(userId, settings) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE user_settings 
        SET msg_delay_seconds = ?, batch_size = ?, prevent_blocking = ?, 
            rate_limit_per_minute = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      this.db.run(query, [
        settings.msg_delay_seconds,
        settings.batch_size,
        settings.prevent_blocking ? 1 : 0,
        settings.rate_limit_per_minute,
        userId
      ], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  // ==================== TEMPLATE OPERATIONS ====================

  createTemplate(userId, name, content, placeholders = []) {
    return new Promise((resolve, reject) => {
      const templateId = uuidv4();
      const query = `
        INSERT INTO templates (id, user_id, name, content, placeholders)
        VALUES (?, ?, ?, ?, ?)
      `;
      this.db.run(query, [templateId, userId, name, content, JSON.stringify(placeholders)], function(err) {
        if (err) reject(err);
        else resolve({ id: templateId, name, content, placeholders });
      });
    });
  }

  getTemplates(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC`;
      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else {
          const templates = rows.map(t => ({
            ...t,
            placeholders: t.placeholders ? JSON.parse(t.placeholders) : []
          }));
          resolve(templates);
        }
      });
    });
  }

  getTemplateById(userId, templateId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM templates WHERE id = ? AND user_id = ?`;
      this.db.get(query, [templateId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? {
          ...row,
          placeholders: row.placeholders ? JSON.parse(row.placeholders) : []
        } : null);
      });
    });
  }

  updateTemplate(userId, templateId, name, content, placeholders = []) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE templates 
        SET name = ?, content = ?, placeholders = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;
      this.db.run(query, [name, content, JSON.stringify(placeholders), templateId, userId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  deleteTemplate(userId, templateId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM templates WHERE id = ? AND user_id = ?`;
      this.db.run(query, [templateId, userId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  // ==================== CONTACT OPERATIONS ====================

  createContact(userId, name, phone, email, customFields = {}) {
    return new Promise((resolve, reject) => {
      const contactId = uuidv4();
      const query = `
        INSERT INTO contacts (id, user_id, name, phone, email, custom_fields)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(query, [contactId, userId, name, phone, email, JSON.stringify(customFields)], function(err) {
        if (err) reject(err);
        else resolve({ id: contactId, name, phone, email, customFields });
      });
    });
  }

  getContacts(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC`;
      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else {
          const contacts = rows.map(c => ({
            ...c,
            customFields: c.custom_fields ? JSON.parse(c.custom_fields) : {}
          }));
          resolve(contacts);
        }
      });
    });
  }

  deleteContact(userId, contactId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM contacts WHERE id = ? AND user_id = ?`;
      this.db.run(query, [contactId, userId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  // ==================== CAMPAIGN OPERATIONS ====================

  createCampaign(userId, name, templateIds = [], useRandomTemplates = false) {
    return new Promise((resolve, reject) => {
      const campaignId = uuidv4();
      const query = `
        INSERT INTO campaigns (id, user_id, name, template_ids, use_random_templates)
        VALUES (?, ?, ?, ?, ?)
      `;
      this.db.run(query, [campaignId, userId, name, JSON.stringify(templateIds), useRandomTemplates ? 1 : 0], function(err) {
        if (err) reject(err);
        else resolve({ id: campaignId, name });
      });
    });
  }

  getCampaigns(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`;
      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else {
          const campaigns = rows.map(c => ({
            ...c,
            template_ids: c.template_ids ? JSON.parse(c.template_ids) : []
          }));
          resolve(campaigns);
        }
      });
    });
  }

  getCampaignById(userId, campaignId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM campaigns WHERE id = ? AND user_id = ?`;
      this.db.get(query, [campaignId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? {
          ...row,
          template_ids: row.template_ids ? JSON.parse(row.template_ids) : []
        } : null);
      });
    });
  }

  updateCampaignStatus(userId, campaignId, status, totalContacts = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE campaigns 
        SET status = ?, total_contacts = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;
      this.db.run(query, [status, totalContacts, campaignId, userId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  incrementCampaignStats(campaignId, success = true) {
    return new Promise((resolve, reject) => {
      const column = success ? 'sent_count' : 'failed_count';
      const query = `
        UPDATE campaigns 
        SET ${column} = ${column} + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(query, [campaignId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  // ==================== LOG OPERATIONS ====================

  addLog(userId, campaignId, phone, status, message) {
    return new Promise((resolve, reject) => {
      const logId = uuidv4();
      const query = `
        INSERT INTO logs (id, user_id, campaign_id, phone, status, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(query, [logId, userId, campaignId, phone, status, message], (err) => {
        if (err) reject(err);
        else resolve(logId);
      });
    });
  }

  getLogs(userId, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM logs 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;
      this.db.all(query, [userId, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== QR SESSION OPERATIONS ====================

  createQRSession(userId, qrCode) {
    return new Promise((resolve, reject) => {
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const query = `
        INSERT INTO qr_sessions (id, user_id, qr_code, status, expires_at)
        VALUES (?, ?, ?, 'waiting', ?)
      `;
      this.db.run(query, [sessionId, userId, qrCode, expiresAt.toISOString()], (err) => {
        if (err) reject(err);
        else resolve(sessionId);
      });
    });
  }

  updateQRSessionStatus(sessionId, status, sessionData = null) {
    return new Promise((resolve, reject) => {
      let query;
      let params;
      
      if (sessionData) {
        query = `
          UPDATE qr_sessions 
          SET status = ?, session_data = ?
          WHERE id = ?
        `;
        params = [status, sessionData, sessionId];
      } else {
        query = `
          UPDATE qr_sessions 
          SET status = ?
          WHERE id = ?
        `;
        params = [status, sessionId];
      }
      
      this.db.run(query, params, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  getQRSessionByUserId(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM qr_sessions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      this.db.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
}

module.exports = Database;
