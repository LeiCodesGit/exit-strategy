const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Course  = require('../models/Course');

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const { year, term, status } = req.query;
  const filter = { userId };
  if (year)   filter.yearLevel = year;
  if (term)   filter.term = term;
  if (status) filter.status = status;

  const courses = await Course.find(filter).sort({ yearLevel: 1, term: 1, name: 1 });
  const yearOrder  = ['1st Year','2nd Year','3rd Year','4th Year'];
  const termOrder  = ['1st','2nd','3rd'];
  const grouped    = {};

  courses.forEach(c => {
    if (!grouped[c.yearLevel]) grouped[c.yearLevel] = {};
    if (!grouped[c.yearLevel][c.term]) grouped[c.yearLevel][c.term] = [];
    grouped[c.yearLevel][c.term].push(c);
  });

  res.render('courses/index', {
    grouped, yearOrder, termOrder,
    filters: { year, term, status },
    statuses: ['Completed','Taking','Pending',,'Remedial', 'Retake','To Take','Future']
  });
});

// Get single course (for edit prefill)
router.get('/:id', auth, async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, userId: req.session.user.id });
  if (!course) return res.status(404).json({ error: 'Not found' });
  res.json(course);
});

// Update status only
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

// Full edit
router.post('/:id/edit', auth, async (req, res) => {
  try {
    const { name, units, yearLevel, term, status, prerequisites, notes } = req.body;
    await Course.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.user.id },
      { name, units: Number(units), yearLevel, term, status, prerequisites, notes, updatedAt: Date.now() }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete course
router.post('/:id/delete', auth, async (req, res) => {
  try {
    await Course.findOneAndDelete({ _id: req.params.id, userId: req.session.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
