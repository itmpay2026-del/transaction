const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { computeFraudScore } = require('../services/fraudScore');
const Dispute = require('../models/Dispute');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Serve fraud score page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/fraudscore.html'));
});

// Get fraud score for a dispute
router.get('/score/:disputeId', authenticate, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    // Check if user is participant
    if (dispute.buyerId.toString() !== req.user._id.toString() &&
        dispute.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this dispute' });
    }

    const transaction = await Transaction.findById(dispute.transactionId);
    const buyer = await User.findById(dispute.buyerId);
    const seller = await User.findById(dispute.sellerId);

    const fraudScore = await computeFraudScore(dispute, buyer, seller, transaction);

    res.json({
      disputeId,
      fraudScore,
      risk: fraudScore > 5 ? 'high' : fraudScore > 2 ? 'medium' : 'low'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get fraud analysis for a transaction (admin only)
router.get('/analyze/:transactionId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { transactionId } = req.params;
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Create a mock dispute for analysis
    const mockDispute = {
      transactionId,
      reason: 'Analysis request',
      evidence: []
    };

    const buyer = await User.findById(transaction.buyerId);
    const seller = await User.findById(transaction.sellerId);

    const fraudScore = await computeFraudScore(mockDispute, buyer, seller, transaction);

    res.json({
      transactionId,
      fraudScore,
      risk: fraudScore > 5 ? 'high' : fraudScore > 2 ? 'medium' : 'low',
      buyer: {
        accountAge: (Date.now() - buyer.createdAt) / (1000 * 3600 * 24),
        rating: buyer.rating,
        disputeCount: buyer.disputeCount
      },
      seller: {
        rating: seller.rating
      },
      transaction: {
        amount: transaction.amount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;