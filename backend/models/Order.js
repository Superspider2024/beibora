const mongoose = require('mongoose');
 
const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
 
  // Order status flow:
  // pending            → Buyer placed request, waiting for admin/farmer decision
  // accepted           → Admin (on behalf of farmer) accepted the order
  // rejected           → Admin (on behalf of farmer) rejected the order
  // awaiting_payment   → Accepted + goods quality-verified, buyer needs to pay
  // delivering         → Payment confirmed, goods in transit to buyer
  // delivered          → Buyer has received the goods
  // cancelled          → Cancelled by buyer or admin before payment
  status: {
    type: String,
    enum: [
      'pending',
      'accepted',
      'rejected',
      'awaiting_payment',
      'delivering',
      'delivered',
      'cancelled',
    ],
    default: 'pending',
  },
 
  // Who cancelled and why
  cancelledBy: {
    type: String,
    enum: ['buyer', 'admin', null],
    default: null,
  },
  cancellationReason: {
    type: String,
    default: null,
  },
 
  // M-Pesa payment details
  mpesaPhone: {
    type: String,
    default: null, // Buyer's phone number used for STK push
  },
  mpesaCode: {
    type: String,
    default: null, // M-Pesa transaction code (manual confirmation fallback)
  },
  mpesaCheckoutRequestId: {
    type: String,
    default: null, // Safaricom STK push CheckoutRequestID for callback matching
  },
  paymentConfirmedAt: {
    type: Date,
    default: null,
  },
 
  // Rating — filled by buyer after delivery (out of 5)
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      default: null,
    },
    ratedAt: {
      type: Date,
      default: null,
    },
  },
 
  // Admin notes (e.g. quality check notes)
  adminNotes: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});
 
module.exports = mongoose.model('Order', orderSchema);