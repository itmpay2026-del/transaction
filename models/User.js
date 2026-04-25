const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  accountAgeDays: { type: Number, default: 0 },
  totalSpent: Number,
  disputeCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 }
});

module.exports = mongoose.model('User', userSchema);
