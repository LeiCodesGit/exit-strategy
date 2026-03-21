const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const courses = await Course.find({ userId });

  const total      = 215;
  const completed  = courses.filter(c => c.status === 'Completed');
  const taking     = courses.filter(c => c.status === 'Taking');
  const pending    = courses.filter(c => c.status === 'Pending');
  const retake     = courses.filter(c => c.status === 'Retake');
  const toTake     = courses.filter(c => c.status === 'To Take');
  const compUnits  = completed.reduce((s, c) => s + (c.units || 0), 0);
  const progress   = Math.round((compUnits / total) * 100);

  // Group by year + term for the course tracker table
  const grouped = {};
  const yearOrder = ['1st Year','2nd Year','3rd Year','4th Year'];
  const termOrder = ['1st','2nd','3rd'];
  courses.forEach(c => {
    const key = c.yearLevel;
    if (!grouped[key]) grouped[key] = {};
    if (!grouped[key][c.term]) grouped[key][c.term] = [];
    grouped[key][c.term].push(c);
  });

  res.render('dashboard/index', {
    stats: { total, compUnits, progress, completed: completed.length,
             taking: taking.length, pending: pending.length,
             retake: retake.length, toTake: toTake.length },
    currentCourses: taking,
    pendingCourses: pending,
    retakeCourses:  retake,
    grouped, yearOrder, termOrder
  });
});

module.exports = router;
