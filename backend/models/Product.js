const mongoose = require('mongoose');
 
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  pricePerUnit: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true, // e.g. kg, bags, crates
  },
  location: {
    type: String,
    required: true,
  },
 
  // Status flow:
  // in stock    → Available for purchase (cooperatives pre-verified)
  // sold        → All stock sold and delivered
  status: {
    type: String,
    enum: ['in stock', 'sold'],
    default: 'in stock',
  },
 
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
 
  // Admin who listed this product on behalf of the farmer
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
 
  description: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});
 
module.exports = mongoose.model('Product', productSchema);