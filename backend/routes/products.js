const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
 
const router = express.Router();
 
// ─── PUBLIC: GET ALL IN-STOCK PRODUCTS (marketplace) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { location, name } = req.query;
    const filter = { status: 'in stock' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (name) filter.name = { $regex: name, $options: 'i' };
 
    const products = await Product.find(filter)
      .populate('farmer', 'name location rating ratingCount')
      .sort({ createdAt: -1 });
 
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── PUBLIC: GET SINGLE PRODUCT ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'name location rating ratingCount');
 
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: ADD PRODUCT FOR A FARMER ─────────────────────────────────────────
// Products from verified cooperatives go directly to marketplace as 'in stock'.
// Quality checks happen when orders are placed (validation by buyer).
router.post('/', auth, [
  body('farmerId').notEmpty().withMessage('Farmer ID is required'),
  body('name').notEmpty().withMessage('Product name is required'),
  body('pricePerUnit').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('stock').isFloat({ gt: 0 }).withMessage('Stock must be a positive number'),
  body('unit').notEmpty().withMessage('Unit is required (e.g. kg, bags, crates)'),
  body('location').notEmpty().withMessage('Location is required'),
], async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const { farmerId, name, pricePerUnit, stock, unit, location, description } = req.body;
 
  try {
    // Verify farmer exists and is managed by this admin
    const farmer = await User.findOne({ _id: farmerId, role: 'farmer', managedBy: req.user.id });
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found or not managed by you' });
 
    const product = new Product({
      name,
      pricePerUnit,
      stock,
      unit,
      location,
      description: description || '',
      farmer: farmerId,
      addedBy: req.user.id,
      status: 'in stock', // Product is available immediately from cooperative
    });
 
    await product.save();
    res.status(201).json(await product.populate('farmer', 'name location'));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: MARK PRODUCT AS SOLD (all stock sold and delivered) ──
router.put('/:id/sold', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    if (product.status !== 'in stock') {
      return res.status(400).json({ msg: `Cannot mark as sold. Product status: ${product.status}` });
    }

    product.status = 'sold';
    await product.save();

    res.json({ msg: 'Product marked as sold', product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: REMOVE PRODUCT (deletes from marketplace) ────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    res.json({ msg: 'Product removed from marketplace', product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: GET ALL PRODUCTS (incl. pending/rejected) ────────────────────────
router.get('/admin/all', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  try {
    const products = await Product.find({ addedBy: req.user.id })
      .populate('farmer', 'name location')
      .sort({ createdAt: -1 });
 
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: UPDATE PRODUCT DETAILS ───────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  const { name, pricePerUnit, stock, unit, location, description } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (pricePerUnit) updates.pricePerUnit = pricePerUnit;
  if (stock !== undefined) updates.stock = stock;
  if (unit) updates.unit = unit;
  if (location) updates.location = location;
  if (description !== undefined) updates.description = description;
 
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, addedBy: req.user.id },
      { $set: updates },
      { new: true }
    ).populate('farmer', 'name location');
 
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
module.exports = router;