// routes/disputes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const Dispute = require('../models/Dispute');
const DisputeMessage = require('../models/DisputeMessage');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { computeFraudScore } = require('../services/fraudScore');
const { callMpayRefund, callMpayRelease } = require('../services/mpayClient');

router.post('/disputes', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { transactionId, reason, evidenceUrls = [] } = req.body;
    const userId = req.user._id;

    // 1. Validate transaction
    const transaction = await Transaction.findById(transactionId).session(session);
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.buyerId.toString() !== userId.toString() &&
        transaction.sellerId.toString() !== userId.toString()) {
      throw new Error('Not a participant');
    }

    // 2. Check existing unresolved dispute
    const existing = await Dispute.findOne({ transactionId, status: { $in: ['open', 'under_review', 'pending_settlement'] } }).session(session);
    if (existing) throw new Error('Dispute already exists');

    // 3. Create dispute
    const dispute = new Dispute({
      transactionId,
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      initiatedBy: userId,
      reason,
      evidence: evidenceUrls.map(url => ({ url, uploadedBy: userId, uploadedAt: new Date() })),
      status: 'open'
    });

    // 4. Compute fraud score
    const buyer = await User.findById(transaction.buyerId).session(session);
    const seller = await User.findById(transaction.sellerId).session(session);
    const fraudScore = await computeFraudScore(dispute, buyer, seller, transaction);
    dispute.fraudScore = fraudScore;

    // 5. Auto‑resolve if score is very low
    let autoResolved = false;
    if (fraudScore < 3) {
      // Auto‑refund buyer (low risk)
      const idempotencyKey = `dispute_${dispute._id}_auto`;
      const refundResult = await callMpayRefund(transactionId, transaction.amount, idempotencyKey);
      dispute.status = 'pending_settlement';
      dispute.autoResolved = true;
      dispute.resolutionDetails = { decision: 'refund_buyer', mpayReference: refundResult.referenceId };
      // Update transaction status (optional)
      transaction.status = 'refunded';
      await transaction.save({ session });
    } else if (fraudScore > 80) {
      // Auto‑reject high risk (or flag for manual review)
      dispute.status = 'rejected';
      dispute.autoResolved = true;
    } else {
      dispute.status = 'open';
    }

    await dispute.save({ session });
    await session.commitTransaction();

    // Emit real‑time event to admins
    const io = req.app.get('io');
    io.to('admins').emit('newDispute', dispute);

    res.status(201).json({ dispute, autoResolved, fraudScore });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});
router.post('/disputes/:disputeId/messages', authenticate, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { message, attachments } = req.body;
    const userId = req.user._id;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    const isParticipant = [dispute.buyerId, dispute.sellerId].some(id => id.equals(userId));
    const isAdmin = req.user.role === 'admin';
    if (!isParticipant && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const newMessage = new DisputeMessage({
      disputeId,
      senderId: userId,
      message,
      attachments: attachments || [],
      timestamp: new Date()
    });
    await newMessage.save();

    // Real‑time: emit to dispute room
    const io = req.app.get('io');
    io.to(`dispute_${disputeId}`).emit('disputeMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/disputes/:disputeId/resolve', authenticate, authorizeAdmin, async (req, res) => {
  const { decision, note } = req.body; // decision: 'refund_buyer' | 'release_to_seller'
  if (!['refund_buyer', 'release_to_seller'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const dispute = await Dispute.findById(req.params.disputeId).session(session);
    if (!dispute) throw new Error('Dispute not found');
    if (!['open', 'under_review'].includes(dispute.status)) {
      throw new Error('Dispute already resolved or in progress');
    }

    const transaction = await Transaction.findById(dispute.transactionId).session(session);
    if (!transaction) throw new Error('Transaction not found');

    // 1. Call mpay (idempotent)
    const idempotencyKey = `dispute_${dispute._id}_admin_${Date.now()}`;
    let mpayResult;
    if (decision === 'refund_buyer') {
      mpayResult = await callMpayRefund(transaction._id, transaction.amount, idempotencyKey);
      transaction.status = 'refunded';
    } else {
      mpayResult = await callMpayRelease(transaction._id, idempotencyKey);
      transaction.status = 'released';
    }

    // 2. Update dispute status to pending settlement (mpay async)
    dispute.status = 'pending_settlement';
    dispute.resolvedBy = req.user._id;
    dispute.resolutionDetails = { decision, note, mpayReference: mpayResult.referenceId };
    dispute.updatedAt = new Date();
    dispute.statusHistory.push({
      status: 'pending_settlement',
      changedBy: req.user._id,
      changedAt: new Date()
    });

    await transaction.save({ session });
    await dispute.save({ session });
    await session.commitTransaction();

    // Notify parties via socket
    const io = req.app.get('io');
    io.to(`user_${dispute.buyerId}`).emit('disputeResolutionInitiated', { disputeId: dispute._id, decision });
    io.to(`user_${dispute.sellerId}`).emit('disputeResolutionInitiated', { disputeId: dispute._id, decision });

    res.json({ message: 'Dispute resolution submitted to mpay', reference: mpayResult.referenceId });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
