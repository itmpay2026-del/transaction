const Dispute = require('../models/Dispute');

const FRAUD_WEIGHTS = {
  REASON_KEYWORDS: {
    'not delivered': 2,
    'never arrived': 2,
    'missing package': 2,
    'defective': 1,
    'fake': 3,
    'scam': 4
  },
  NO_EVIDENCE: 3,
  NEW_BUYER_DAYS: 7,
  NEW_BUYER_PENALTY: 2,
  HIGH_VALUE_THRESHOLD: 100,
  HIGH_VALUE_MULTIPLIER: 0.01,
  SELLER_LOW_RATING: 2,
  SELLER_RATING_THRESHOLD: 4.0,
  BUYER_PREVIOUS_DISPUTES: 1.5
};

async function computeFraudScore(dispute, buyer, seller, transaction) {
  let score = 0;

  const reasonLower = dispute.reason.toLowerCase();
  for (const [keyword, weight] of Object.entries(FRAUD_WEIGHTS.REASON_KEYWORDS)) {
    if (reasonLower.includes(keyword)) {
      score += weight;
      break;
    }
  }

  if (!dispute.evidence || dispute.evidence.length === 0) score += FRAUD_WEIGHTS.NO_EVIDENCE;

  const accountAgeDays = (Date.now() - buyer.createdAt) / (1000 * 3600 * 24);
  if (accountAgeDays < FRAUD_WEIGHTS.NEW_BUYER_DAYS) score += FRAUD_WEIGHTS.NEW_BUYER_PENALTY;

  if (transaction.amount > FRAUD_WEIGHTS.HIGH_VALUE_THRESHOLD) {
    score += (transaction.amount - FRAUD_WEIGHTS.HIGH_VALUE_THRESHOLD) * FRAUD_WEIGHTS.HIGH_VALUE_MULTIPLIER;
  }

  if (seller.rating < FRAUD_WEIGHTS.SELLER_RATING_THRESHOLD) score += FRAUD_WEIGHTS.SELLER_LOW_RATING;

  const previousDisputes = await Dispute.countDocuments({ buyerId: buyer._id, status: 'resolved' });
  score += previousDisputes * FRAUD_WEIGHTS.BUYER_PREVIOUS_DISPUTES;

  return Math.min(Math.round(score), 100);
}

module.exports = { computeFraudScore };
