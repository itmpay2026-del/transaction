const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  transactionId: { type: String, ref: 'Transaction', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'under_review', 'pending_settlement', 'resolved', 'rejected'],
    default: 'open'
  },
  evidence: [{
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: Date
  }],
  fraudScore: { type: Number, default: 0 },
  autoResolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionDetails: {
    decision: { type: String, enum: ['refund_buyer', 'release_to_seller', 'partial_refund'] },
    note: String,
    mpayReference: String
  },
  statusHistory: [{
    status: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: Date
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dispute', disputeSchema);
