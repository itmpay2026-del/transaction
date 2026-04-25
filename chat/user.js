const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user disputes
router.get('/disputes', authenticate, async (req, res) => {
  try {
    const Dispute = require('../models/Dispute');
    const disputes = await Dispute.find({
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }]
    });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;