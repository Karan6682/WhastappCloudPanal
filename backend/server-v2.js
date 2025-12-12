const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const csvParser = require('csv-parser');

const Database = require('./db/database-v2');
const { authMiddleware, generateToken } = require('./middleware/auth');
const WhatsAppService = require('./services/whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database and WhatsApp service
const db = new Database();
const whatsappService = new WhatsAppService(db);

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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'text/csv'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ==================== AUTH ENDPOINTS ====================

// Register new user (admin only in production)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if user exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.createUser(username, email || null, passwordHash);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        whatsapp_connected: user.whatsapp_connected === 1
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.userId);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      whatsapp_connected: user.whatsapp_connected === 1,
      whatsapp_phone: user.whatsapp_phone
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WHATSAPP ENDPOINTS ====================

// Start WhatsApp QR code authentication
app.post('/api/whatsapp/start-qr', authMiddleware, async (req, res) => {
  try {
    const result = await whatsappService.startQRCodeAuth(req.userId);
    res.json({
      success: true,
      message: 'QR code generated. Scan to connect.',
      sessionId: result.sessionId
    });
  } catch (error) {
    console.error('QR start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get QR code
app.get('/api/whatsapp/qr-code', authMiddleware, async (req, res) => {
  try {
    const qrCode = await whatsappService.getQRCode(req.userId);
    if (!qrCode) {
      return res.status(404).json({ error: 'No active QR session' });
    }
    res.json({ qrCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get WhatsApp connection status
app.get('/api/whatsapp/status', authMiddleware, async (req, res) => {
  try {
    const status = await whatsappService.getConnectionStatus(req.userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect WhatsApp
app.post('/api/whatsapp/disconnect', authMiddleware, async (req, res) => {
  try {
    await whatsappService.disconnect(req.userId);
    res.json({ success: true, message: 'Disconnected from WhatsApp' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SETTINGS ENDPOINTS ====================

// Get user settings
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await db.getUserSettings(req.userId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user settings
app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { msg_delay_seconds, batch_size, prevent_blocking, rate_limit_per_minute } = req.body;

    const settings = {
      msg_delay_seconds: msg_delay_seconds || 5,
      batch_size: batch_size || 100,
      prevent_blocking: prevent_blocking !== false,
      rate_limit_per_minute: rate_limit_per_minute || 30
    };

    await db.updateUserSettings(req.userId, settings);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEMPLATE ENDPOINTS ====================

// Create template
app.post('/api/templates', authMiddleware, async (req, res) => {
  try {
    const { name, content, placeholders } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content required' });
    }

    const template = await db.createTemplate(req.userId, name, content, placeholders || []);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get templates
app.get('/api/templates', authMiddleware, async (req, res) => {
  try {
    const templates = await db.getTemplates(req.userId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template
app.get('/api/templates/:id', authMiddleware, async (req, res) => {
  try {
    const template = await db.getTemplateById(req.userId, req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update template
app.put('/api/templates/:id', authMiddleware, async (req, res) => {
  try {
    const { name, content, placeholders } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content required' });
    }

    await db.updateTemplate(req.userId, req.params.id, name, content, placeholders || []);

    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete template
app.delete('/api/templates/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteTemplate(req.userId, req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONTACT ENDPOINTS ====================

// Create contact
app.post('/api/contacts', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, customFields } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const contact = await db.createContact(req.userId, name, phone, email, customFields || {});

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      contact
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contacts
app.get('/api/contacts', authMiddleware, async (req, res) => {
  try {
    const contacts = await db.getContacts(req.userId);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contact
app.delete('/api/contacts/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteContact(req.userId, req.params.id);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload CSV contacts
app.post('/api/contacts/bulk-upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const contacts = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        contacts.push({
          name: row.name || '',
          phone: row.phone || '',
          email: row.email || ''
        });
      })
      .on('end', async () => {
        try {
          let createdCount = 0;
          for (const contact of contacts) {
            if (contact.phone) {
              await db.createContact(
                req.userId,
                contact.name,
                contact.phone,
                contact.email,
                {}
              );
              createdCount++;
            }
          }

          // Clean up uploaded file
          await fs.remove(filePath);

          res.json({
            success: true,
            message: `${createdCount} contacts imported successfully`,
            count: createdCount
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      })
      .on('error', (error) => {
        res.status(400).json({ error: 'Error parsing CSV: ' + error.message });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CAMPAIGN ENDPOINTS ====================

// Create campaign with random template distribution
app.post('/api/campaigns', authMiddleware, async (req, res) => {
  try {
    const { name, templateIds, useRandomTemplates, contactIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name required' });
    }

    if (useRandomTemplates && (!templateIds || templateIds.length < 2)) {
      return res.status(400).json({ error: 'Random templates require at least 2 templates' });
    }

    const campaign = await db.createCampaign(req.userId, name, templateIds || [], useRandomTemplates || false);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaigns
app.get('/api/campaigns', authMiddleware, async (req, res) => {
  try {
    const campaigns = await db.getCampaigns(req.userId);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single campaign
app.get('/api/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await db.getCampaignById(req.userId, req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send campaign messages with random template distribution
app.post('/api/campaigns/:id/send', authMiddleware, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { contactIds } = req.body;

    // Get campaign
    const campaign = await db.getCampaignById(req.userId, campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get contacts
    const allContacts = await db.getContacts(req.userId);
    const selectedContacts = contactIds && contactIds.length > 0
      ? allContacts.filter(c => contactIds.includes(c.id))
      : allContacts;

    if (selectedContacts.length === 0) {
      return res.status(400).json({ error: 'No contacts selected' });
    }

    // Get settings
    const settings = await db.getUserSettings(req.userId);

    // Update campaign status
    await db.updateCampaignStatus(req.userId, campaignId, 'running', selectedContacts.length);

    // Send messages (non-blocking)
    setImmediate(async () => {
      try {
        if (campaign.use_random_templates && campaign.template_ids.length > 0) {
          // Random template distribution mode
          const templates = await Promise.all(
            campaign.template_ids.map(id => db.getTemplateById(req.userId, id))
          );

          const contactsByTemplate = {};
          campaign.template_ids.forEach((_, idx) => {
            contactsByTemplate[idx] = [];
          });

          // Distribute contacts randomly among templates
          selectedContacts.forEach(contact => {
            const randomIdx = Math.floor(Math.random() * templates.length);
            contactsByTemplate[randomIdx].push(contact);
          });

          // Send messages for each template group
          for (let idx = 0; idx < templates.length; idx++) {
            const template = templates[idx];
            const contacts = contactsByTemplate[idx];

            if (template && contacts.length > 0) {
              await whatsappService.sendBulkMessages(
                req.userId,
                campaignId,
                contacts,
                template.content,
                settings,
                db
              );
            }
          }
        } else if (campaign.template_ids.length > 0) {
          // Single template mode
          const template = await db.getTemplateById(req.userId, campaign.template_ids[0]);
          if (template) {
            await whatsappService.sendBulkMessages(
              req.userId,
              campaignId,
              selectedContacts,
              template.content,
              settings,
              db
            );
          }
        }

        await db.updateCampaignStatus(req.userId, campaignId, 'completed');
      } catch (error) {
        console.error('Campaign send error:', error);
        await db.updateCampaignStatus(req.userId, campaignId, 'failed');
      }
    });

    res.json({
      success: true,
      message: 'Campaign started. Messages being sent...',
      campaignId,
      totalContacts: selectedContacts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOG ENDPOINTS ====================

// Get logs
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const logs = await db.getLogs(req.userId, limit, offset);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '✅ WhatsApp Automation Backend running',
    timestamp: new Date()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ WhatsApp Automation Backend running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
});
