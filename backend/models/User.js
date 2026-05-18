const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'buyer', 'farmer'],
    required: true,
  },

  // Farmer-only: ratings. Starts at 2.5, updated after each delivered order
  rating: {
    type: Number,
    default: 2.5,
    min: 0,
    max: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },

  // Farmer-only: which admin/depot manages this farmer
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound unique index: same email allowed for different roles
userSchema.index({ email: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);