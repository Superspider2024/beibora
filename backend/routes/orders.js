const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Create order (buyer)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const { productId, quantity, mpesaCode } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product || product.status !== 'verified') {
      return res.status(400).json({ msg: 'Product not available' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ msg: 'Insufficient stock' });
    }

    const totalPrice = product.pricePerUnit * quantity;

    const order = new Order({
      buyer: req.user.id,
      product: productId,
      quantity,
      totalPrice,
      mpesaCode,
      status: 'awaiting_verification',
    });

    await order.save();

    // Update product stock
    product.stock -= quantity;
    if (product.stock === 0) {
      product.status = 'sold';
    }
    await product.save();

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get orders for user
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id }).populate('product');
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all orders (admin)
router.get('/all', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  try {
    const orders = await Order.find().populate('buyer product');
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update order status (admin)
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('product');
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // If status is in_transit, update product status
    if (status === 'in_transit') {
      await Product.findByIdAndUpdate(order.product._id, { status: 'in_transit' });
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;