const mongoose = require('mongoose');

const disputeMessageSchema = new mongoose.Schema({
  disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  attachments: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DisputeMessage', disputeMessageSchema);
