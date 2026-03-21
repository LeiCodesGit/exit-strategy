const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const { year, term, status } = req.query;
  const filter = { userId };
  if (year)   filter.yearLevel = year;
  if (term)   filter.term = term;
  if (status) filter.status = status;

  const courses = await Course.find(filter).sort({ yearLevel: 1, term: 1 });
  const yearOrder = ['1st Year','2nd Year','3rd Year','4th Year'];
  const termOrder = ['1st','2nd','3rd'];

  const grouped = {};
  courses.forEach(c => {
    const key = c.yearLevel;
    if (!grouped[key]) grouped[key] = {};
    if (!grouped[key][c.term]) grouped[key][c.term] = [];
    grouped[key][c.term].push(c);
  });

  res.render('courses/index', {
    grouped, yearOrder, termOrder,
    filters: { year, term, status },
    statuses: ['Completed','Taking','Pending','Retake','To Take','Future']
  });
});

router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    await Course.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.user.id },
      { status, notes, updatedAt: Date.now() }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, userId: req.session.user.id });
  if (!course) return res.redirect('/courses');
  res.json(course);
});

module.exports = router;
