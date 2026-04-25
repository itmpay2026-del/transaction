const axios = require('axios');

const mpayAxios = axios.create({
  baseURL: process.env.MPAY_API_URL,
  headers: { 'X-API-Key': process.env.MPAY_API_KEY },
  timeout: 10000
});

async function callMpayRefund(transactionId, amount, idempotencyKey) {
  try {
    const response = await mpayAxios.post('/refund', {
      transactionId,
      amount,
      idempotencyKey
    });
    return { referenceId: response.data.referenceId };
  } catch (err) {
    console.error('mpay refund failed:', err.response?.data || err.message);
    throw new Error(`mpay refund error: ${err.response?.data?.message || err.message}`);
  }
}

async function callMpayRelease(transactionId, idempotencyKey) {
  const response = await mpayAxios.post('/release', {
    transactionId,
    idempotencyKey
  });
  return { referenceId: response.data.referenceId };
}

module.exports = { callMpayRefund, callMpayRelease };
