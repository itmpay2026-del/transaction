const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/database');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    
    // If Mongo user is missing (e.g. after server restart clears MongoMemoryServer), rehydrate from SQLite
    if (!req.user && decoded.id) {
      const sqliteUser = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [decoded.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (sqliteUser) {
        const newUserObj = {
          email: sqliteUser.email,
          password: sqliteUser.password,
          name: sqliteUser.email.split('@')[0]
        };
        if (decoded.userId) newUserObj._id = decoded.userId;
        
        req.user = new User(newUserObj);
        await req.user.save();
      }
    }

    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};
