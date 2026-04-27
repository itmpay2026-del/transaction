const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id) return res.status(401).json({ message: 'Invalid token' });

    // Get user email from SQLite
    db.get('SELECT email FROM users WHERE id = ?', [decoded.id], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row) return res.status(401).json({ message: 'User not found' });

      req.user = { id: decoded.id, email: row.email };
      next();
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;