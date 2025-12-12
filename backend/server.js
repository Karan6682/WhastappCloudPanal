const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const Database = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
const db = new Database();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Setup multer for file uploads
const uploadDir = path.join(__dirname, '..', 'backend-uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ==================== TEMPLATES ====================
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await db.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const id = uuidv4();
    const template = await db.createTemplate({ id, title, content, createdAt: new Date().toISOString() });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const template = await db.updateTemplate(id, { title, content, updatedAt: new Date().toISOString() });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteTemplate(id);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONTACTS ====================
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await db.getContacts();
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { phone, name, email } = req.body;
    if (!phone || !name) {
      return res.status(400).json({ error: 'Phone and name are required' });
    }
    const id = uuidv4();
    const contact = await db.createContact({ id, phone, name, email, createdAt: new Date().toISOString() });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await db.updateContact(id, { ...req.body, updatedAt: new Date().toISOString() });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteContact(id);
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const contacts = await db.bulkUploadContacts(req.file.path);
    res.json({ message: 'Contacts uploaded', count: contacts.length, contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CAMPAIGNS ====================
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await db.getCampaigns();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, templateId, contacts, pdfFile } = req.body;
    if (!name || !templateId) {
      return res.status(400).json({ error: 'Name and template ID are required' });
    }
    const id = uuidv4();
    const campaign = await db.createCampaign({ 
      id, 
      name, 
      templateId, 
      contacts, 
      pdfFile,
      status: 'draft',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString()
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await db.updateCampaign(id, { ...req.body, updatedAt: new Date().toISOString() });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteCampaign(id);
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATISTICS ====================
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const stats = await db.getCampaignStats(campaignId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOGS ====================
app.get('/api/logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = await db.getLogs(parseInt(limit), parseInt(offset));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { type, message, campaignId, contactId } = req.body;
    const log = await db.createLog({ 
      id: uuidv4(),
      type, 
      message, 
      campaignId, 
      contactId,
      createdAt: new Date().toISOString()
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FILE UPLOAD ====================
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    res.json({
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`✅ WhatsApp Automation Backend running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
});

module.exports = app;
