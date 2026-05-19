const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin-only farmer and order summary counts
router.get('/stats', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  try {
    const farmers = await User.find({ role: 'farmer', managedBy: req.user.id }).select('_id isActive');
    const farmerIds = farmers.map((farmer) => farmer._id);

    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter((farmer) => farmer.isActive).length;

    const totalOrders = await Order.countDocuments({ farmer: { $in: farmerIds } });
    const pendingOrders = await Order.countDocuments({ farmer: { $in: farmerIds }, status: 'pending' });
    const deliveringOrders = await Order.countDocuments({ farmer: { $in: farmerIds }, status: 'delivering' });
    const deliveredOrders = await Order.countDocuments({ farmer: { $in: farmerIds }, status: 'delivered' });

    res.json({
      totalFarmers,
      activeFarmers,
      totalOrders,
      pendingOrders,
      deliveringOrders,
      deliveredOrders,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
