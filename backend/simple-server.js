const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(cors());

// Initialize SQLite Database
const dbPath = path.join(__dirname, '../whatsapp.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ SQLite Database connected');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
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
    `, (err) => {
      if (err) console.error('Error creating users table:', err);
    });

    // User Settings table
    db.run(`
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
    `, (err) => {
      if (err) console.error('Error creating user_settings table:', err);
    });

    // Check if admin user exists
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (!row) {
        // Create admin user
        const adminId = require('uuid').v4();
        const passwordHash = require('bcryptjs').hashSync('admin123', 10);
        
        db.run(
          'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
          [adminId, 'admin', 'admin@example.com', passwordHash],
          (err) => {
            if (err) console.error('Error creating admin user:', err);
            else console.log('✅ Admin user created (username: admin, password: admin123)');
          }
        );

        // Create default settings for admin
        const settingsId = require('uuid').v4();
        db.run(
          'INSERT INTO user_settings (id, user_id) VALUES (?, ?)',
          [settingsId, adminId],
          (err) => {
            if (err) console.error('Error creating admin settings:', err);
          }
        );
      }
    });

    console.log('📊 All database tables initialized');
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '✅ WhatsApp Automation Backend running',
    timestamp: new Date()
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const userId = require('uuid').v4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
    [userId, username, email, passwordHash],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Registration failed' });
      }

      const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        token,
        user: { id: userId, username, email }
      });
    }
  );
});

// Get user profile
app.get('/api/user/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.get('SELECT id, username, email FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'User not found' });
      }
      res.json(user);
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 WhatsApp Automation Backend running on http://localhost:' + PORT);
  console.log('📊 Dashboard: http://localhost:3000');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
