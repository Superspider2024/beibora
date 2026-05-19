const express = require('express');
const axios = require('axios');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to get Daraja base URLs based on env
const getMpesaBase = () => {
  return process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

// Obtain OAuth token from Daraja
async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('MPESA_CONSUMER_KEY/SECRET not set');

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const url = `${getMpesaBase()}/oauth/v1/generate?grant_type=client_credentials`;

  const res = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return res.data.access_token;
}

// Initiate STK Push for an existing order
router.post('/stkpush', auth, async (req, res) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const { orderId, phone, callbackUrl } = req.body;
  if (!orderId || !phone) return res.status(400).json({ msg: 'orderId and phone required' });

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (String(order.buyer) !== req.user.id) return res.status(403).json({ msg: 'Not your order' });

    const token = await getAccessToken();

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14); // YYYYMMDDhhmmss
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    if (!shortcode || !passkey) return res.status(500).json({ msg: 'MPESA_SHORTCODE/MPESA_PASSKEY missing' });

    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    const amount = Math.round(order.totalPrice);

    const stkUrl = `${getMpesaBase()}/mpesa/stkpush/v1/processrequest`;

    const cbUrl = callbackUrl || (process.env.MPESA_CALLBACK_URL || `${process.env.APP_BASE_URL || ''}/api/payments/stkpush/callback`);

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: cbUrl,
      AccountReference: String(order._id),
      TransactionDesc: `Beibora order ${order._id}`,
    };

    const resp = await axios.post(stkUrl, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    // Save CheckoutRequestID and move order to awaiting_payment
    const checkoutReqId = resp.data?.CheckoutRequestID || resp.data?.ResponseDescription || null;
    order.mpesaCheckoutRequestId = checkoutReqId;
    order.mpesaPhone = phone;
    order.status = 'awaiting_payment';
    await order.save();

    res.json({ msg: 'STK Push initiated', CheckoutRequestID: checkoutReqId, raw: resp.data });
  } catch (err) {
    console.error('MPESA STK Push error:', err?.response?.data || err.message);
    res.status(500).json({ msg: 'MPESA STK Push failed', error: err?.response?.data || err.message });
  }
});

// Callback endpoint for Daraja to post payment results
router.post('/stkpush/callback', async (req, res) => {
  try {
    // Optional simple secret check
    const secret = process.env.MPESA_CALLBACK_SECRET;
    if (secret) {
      const header = req.headers['x-mpesa-callback-secret'] || req.headers['x-callback-secret'];
      if (header !== secret) {
        console.warn('MPESA callback secret mismatch');
        // still respond 200 to Daraja to avoid retries, but log
      }
    }

    const body = req.body;

    // Daraja callback wraps the result in Body.stkCallback
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.warn('Unexpected MPESA callback shape', body);
      return res.json({ result: 'ignored' });
    }

    const checkoutId = stkCallback?.CheckoutRequestID;
    const resultCode = stkCallback?.ResultCode;
    const callbackMetadata = stkCallback?.CallbackMetadata;

    // Find order by checkout id
    const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutId });
    if (!order) {
      console.warn('Order not found for CheckoutRequestID', checkoutId);
      return res.json({ result: 'no-order' });
    }

    if (resultCode === 0) {
      // extract MpesaReceiptNumber from metadata
      let receipt = null;
      if (callbackMetadata && Array.isArray(callbackMetadata?.Item)) {
        const receiptItem = callbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber' || i.Name === 'MpesaReceiptNo');
        if (receiptItem) receipt = receiptItem.Value;
      }

      order.mpesaCode = receipt || 'unknown';
      order.paymentConfirmedAt = new Date();
      order.status = 'delivering';
      await order.save();

      return res.json({ result: 'success' });
    } else {
      // payment failed or cancelled
      order.status = 'pending';
      await order.save();
      return res.json({ result: 'failed' });
    }
  } catch (err) {
    console.error('MPESA callback processing error', err.message);
    // respond 200 so Daraja doesn't retry aggressively
    res.json({ result: 'error' });
  }
});

module.exports = router;
