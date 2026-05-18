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
    if (!product || product.status !== 'in stock') {
      return res.status(400).json({ msg: 'Product not available' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ msg: 'Insufficient stock' });
    }

    const totalPrice = product.pricePerUnit * quantity;

    const order = new Order({
      buyer: req.user.id,
      farmer: product.farmer,
      product: productId,
      quantity,
      totalPrice,
      mpesaCode,
      status: 'pending',
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

    // Update product status based on order status
    if (status === 'delivering') {
      await Product.findByIdAndUpdate(order.product._id, { status: 'in_transit' });
    } else if (status === 'delivered') {
      // Check if all orders for this product are delivered, if so mark as sold
      const pendingOrders = await Order.find({ 
        product: order.product._id, 
        status: { $ne: 'delivered' } 
      });
      if (pendingOrders.length === 0) {
        await Product.findByIdAndUpdate(order.product._id, { status: 'sold' });
      }
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;//gtrfdgsg