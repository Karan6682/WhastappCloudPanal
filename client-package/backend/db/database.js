const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '..', '..', 'whatsapp.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Templates table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          createdAt TEXT,
          updatedAt TEXT
        )
      `);

      // Contacts table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )
      `);

      // Campaigns table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          templateId TEXT NOT NULL,
          contacts TEXT,
          pdfFile TEXT,
          status TEXT DEFAULT 'draft',
          sentCount INTEGER DEFAULT 0,
          failedCount INTEGER DEFAULT 0,
          createdAt TEXT,
          updatedAt TEXT,
          FOREIGN KEY(templateId) REFERENCES templates(id)
        )
      `);

      // Logs table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          message TEXT,
          campaignId TEXT,
          contactId TEXT,
          createdAt TEXT,
          FOREIGN KEY(campaignId) REFERENCES campaigns(id),
          FOREIGN KEY(contactId) REFERENCES contacts(id)
        )
      `);

      // Stats table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS stats (
          id TEXT PRIMARY KEY,
          campaignId TEXT,
          date TEXT,
          totalSent INTEGER DEFAULT 0,
          totalFailed INTEGER DEFAULT 0,
          totalPending INTEGER DEFAULT 0,
          FOREIGN KEY(campaignId) REFERENCES campaigns(id)
        )
      `);
    });
  }

  // ========== TEMPLATES ==========
  getTemplates() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM templates ORDER BY createdAt DESC`, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  }

  createTemplate(template) {
    return new Promise((resolve, reject) => {
      const { id, title, content, createdAt } = template;
      this.db.run(
        `INSERT INTO templates (id, title, content, createdAt) VALUES (?, ?, ?, ?)`,
        [id, title, content, createdAt],
        function(err) {
          if (err) reject(err);
          resolve(template);
        }
      );
    });
  }

  updateTemplate(id, data) {
    return new Promise((resolve, reject) => {
      const { title, content, updatedAt } = data;
      this.db.run(
        `UPDATE templates SET title = ?, content = ?, updatedAt = ? WHERE id = ?`,
        [title, content, updatedAt, id],
        function(err) {
          if (err) reject(err);
          resolve({ id, ...data });
        }
      );
    });
  }

  deleteTemplate(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM templates WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        resolve();
      });
    });
  }

  // ========== CONTACTS ==========
  getContacts() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM contacts ORDER BY createdAt DESC`, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  }

  createContact(contact) {
    return new Promise((resolve, reject) => {
      const { id, phone, name, email, createdAt } = contact;
      this.db.run(
        `INSERT INTO contacts (id, phone, name, email, createdAt) VALUES (?, ?, ?, ?, ?)`,
        [id, phone, name, email, createdAt],
        function(err) {
          if (err) reject(err);
          resolve(contact);
        }
      );
    });
  }

  updateContact(id, data) {
    return new Promise((resolve, reject) => {
      const { phone, name, email, updatedAt } = data;
      this.db.run(
        `UPDATE contacts SET phone = ?, name = ?, email = ?, updatedAt = ? WHERE id = ?`,
        [phone, name, email, updatedAt, id],
        function(err) {
          if (err) reject(err);
          resolve({ id, ...data });
        }
      );
    });
  }

  deleteContact(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM contacts WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        resolve();
      });
    });
  }

  bulkUploadContacts(filePath) {
    return new Promise(async (resolve, reject) => {
      try {
        const fs = require('fs-extra');
        const parse = require('csv-parse/lib/sync');
        const csv = await fs.readFile(filePath, 'utf8');
        const records = parse(csv, { columns: true, skip_empty_lines: true });
        const { v4: uuidv4 } = require('uuid');

        for (const record of records) {
          const id = uuidv4();
          await this.createContact({
            id,
            phone: record.phone,
            name: record.name,
            email: record.email || '',
            createdAt: new Date().toISOString()
          });
        }
        resolve(records);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========== CAMPAIGNS ==========
  getCampaigns() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM campaigns ORDER BY createdAt DESC`, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  }

  createCampaign(campaign) {
    return new Promise((resolve, reject) => {
      const { id, name, templateId, contacts, pdfFile, status, sentCount, failedCount, createdAt } = campaign;
      this.db.run(
        `INSERT INTO campaigns (id, name, templateId, contacts, pdfFile, status, sentCount, failedCount, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, templateId, JSON.stringify(contacts), pdfFile, status, sentCount, failedCount, createdAt],
        function(err) {
          if (err) reject(err);
          resolve(campaign);
        }
      );
    });
  }

  updateCampaign(id, data) {
    return new Promise((resolve, reject) => {
      const updates = [];
      const values = [];
      
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'id') {
          updates.push(`${key} = ?`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
      
      values.push(id);
      
      this.db.run(
        `UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          resolve({ id, ...data });
        }
      );
    });
  }

  deleteCampaign(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM campaigns WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        resolve();
      });
    });
  }

  // ========== LOGS ==========
  getLogs(limit, offset) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM logs ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  createLog(log) {
    return new Promise((resolve, reject) => {
      const { id, type, message, campaignId, contactId, createdAt } = log;
      this.db.run(
        `INSERT INTO logs (id, type, message, campaignId, contactId, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, type, message, campaignId, contactId, createdAt],
        function(err) {
          if (err) reject(err);
          resolve(log);
        }
      );
    });
  }

  // ========== STATS ==========
  getStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM stats ORDER BY date DESC`, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  }

  getCampaignStats(campaignId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM stats WHERE campaignId = ? ORDER BY date DESC`,
        [campaignId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = Database;
