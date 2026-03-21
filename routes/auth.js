const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const COURSES_SEED = require('../models/coursesSeed');

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login');
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register');
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirm } = req.body;
    if (password !== confirm) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/register');
    }
    const exists = await User.findOne({ email });
    if (exists) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/register');
    }
    const user = await User.create({ name, email, password });

    // Seed all CPE courses for this user
    const userCourses = COURSES_SEED.map(c => ({ ...c, userId: user._id }));
    await Course.insertMany(userCourses);

    req.session.user = { id: user._id, name: user.name, email: user.email };
    req.flash('success', `Welcome to Exit Strategy, ${user.name}! Your courses have been loaded.`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/register');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }
    req.session.user = { id: user._id, name: user.name, email: user.email };
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/login');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
