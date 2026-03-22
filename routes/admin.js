const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/admin');
const User = require('../models/User');
const Course = require('../models/Course');

// List all users
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    // Get course counts per user
    const courseCounts = await Course.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    courseCounts.forEach(c => { countMap[c._id.toString()] = c.count; });
    users.forEach(u => { u.courseCount = countMap[u._id.toString()] || 0; });

    res.render('admin/index', { users, flash: req.flash() });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

// Edit user form
router.get('/users/:id/edit', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) { req.flash('error', 'User not found.'); return res.redirect('/admin'); }
    res.render('admin/edit-user', { editUser: user });
  } catch (err) {
    res.redirect('/admin');
  }
});

// Update user info
router.post('/users/:id/edit', adminAuth, async (req, res) => {
  try {
    const { name, email, isAdmin } = req.body;
    await User.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      isAdmin: isAdmin === 'on'
    });
    req.flash('success', 'User updated successfully.');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', 'Failed to update user.');
    res.redirect('/admin');
  }
});

// Delete user + all their courses
router.post('/users/:id/delete', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    // Prevent admin from deleting themselves
    if (userId === req.session.user.id.toString()) {
      return res.json({ success: false, error: 'You cannot delete your own account.' });
    }
    await Course.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get all courses for a user
router.get('/users/:id/courses', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) { req.flash('error', 'User not found.'); return res.redirect('/admin'); }
    const courses = await Course.find({ userId: req.params.id })
      .sort({ yearLevel: 1, term: 1, name: 1 }).lean();
    res.render('admin/user-courses', { targetUser: user, courses });
  } catch (err) {
    req.flash('error', 'Error loading courses.');
    res.redirect('/admin');
  }
});

// Edit a specific course (admin)
router.post('/courses/:id/edit', adminAuth, async (req, res) => {
  try {
    const { name, code, units, yearLevel, term, status, prerequisites, notes } = req.body;
    await Course.findByIdAndUpdate(req.params.id, {
      name, code, units: Number(units), yearLevel, term, status, prerequisites, notes,
      updatedAt: Date.now()
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Delete a specific course (admin)
router.post('/courses/:id/delete', adminAuth, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Delete ALL courses for a user
router.post('/users/:id/courses/delete-all', adminAuth, async (req, res) => {
  try {
    await Course.deleteMany({ userId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
