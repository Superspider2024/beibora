const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
 
const router = express.Router();
 
// ─── ADMIN: CREATE FARMER ACCOUNT ─────────────────────────────────────────────
// Farmer comes to the depot office, admin registers them.
// Farmers don't log in — admin manages their listings and orders on their behalf.
// A random password is generated internally (not given to farmer).
router.post('/farmers', auth, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('number').notEmpty().withMessage('Phone number is required'),
  body('location').notEmpty().withMessage('Location is required'),
], async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const { name, email, number, location } = req.body;
 
  try {
    let existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'A user with this email already exists' });
 
    // Auto-generate a secure internal password (farmer never logs in)
    const autoPassword = crypto.randomBytes(24).toString('hex');
 
    const farmer = new User({
      name,
      email,
      password: await bcrypt.hash(autoPassword, 10),
      number,
      location,
      role: 'farmer',
      managedBy: req.user.id,
    });
 
    await farmer.save();
 
    // Return farmer without password
    const result = await User.findById(farmer.id).select('-password');
    res.status(201).json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: GET ALL FARMERS THEY MANAGE ──────────────────────────────────────
router.get('/farmers', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  try {
    const farmers = await User.find({ role: 'farmer', managedBy: req.user.id })
      .select('-password')
      .sort({ createdAt: -1 });
 
    res.json(farmers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: GET A SINGLE FARMER ───────────────────────────────────────────────
router.get('/farmers/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  try {
    const farmer = await User.findOne({ _id: req.params.id, role: 'farmer', managedBy: req.user.id })
      .select('-password');
 
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });
    res.json(farmer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── ADMIN: UPDATE FARMER DETAILS ────────────────────────────────────────────
router.put('/farmers/:id', auth, [
  body('name').optional().notEmpty(),
  body('number').optional().notEmpty(),
  body('location').optional().notEmpty(),
], async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
 
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const { name, number, location, isActive } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (number !== undefined) updates.number = number;
  if (location !== undefined) updates.location = location;
  if (isActive !== undefined) updates.isActive = isActive;
 
  try {
    const farmer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'farmer', managedBy: req.user.id },
      { $set: updates },
      { new: true }
    ).select('-password');
 
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });
    res.json(farmer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
// ─── PUBLIC: GET FARMER PROFILE & RATING (for buyers to view) ────────────────
router.get('/farmers/:id/profile', async (req, res) => {
  try {
    const farmer = await User.findOne({ _id: req.params.id, role: 'farmer' })
      .select('name location rating ratingCount');
 
    if (!farmer) return res.status(404).json({ msg: 'Farmer not found' });
    res.json(farmer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── AUTHENTICATED: GET CURRENT USER PROFILE ─────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
 
module.exports = router;