const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-automation-secret-key-2025';

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Generate JWT token
const generateToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = { authMiddleware, generateToken, JWT_SECRET };
