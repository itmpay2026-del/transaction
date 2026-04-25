// routes/webhooks.js
const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');

router.post('/mpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-mpay-signature'];
  // Verify webhook signature (omitted for brevity)
  const { referenceId, status, transactionId } = req.body;

  if (status === 'completed') {
    const dispute = await Dispute.findOne({ 'resolutionDetails.mpayReference': referenceId });
    if (dispute && dispute.status === 'pending_settlement') {
      dispute.status = 'resolved';
      dispute.updatedAt = new Date();
      await dispute.save();

      // Notify users
      const io = req.app.get('io');
      io.to(`user_${dispute.buyerId}`).emit('disputeFinalized', { disputeId: dispute._id, outcome: dispute.resolutionDetails.decision });
      io.to(`user_${dispute.sellerId}`).emit('disputeFinalized', { disputeId: dispute._id, outcome: dispute.resolutionDetails.decision });
    }
  }
  res.sendStatus(200);
});

module.exports = router;