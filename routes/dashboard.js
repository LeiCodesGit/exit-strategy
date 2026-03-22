const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const courses = await Course.find({ userId }).sort({ yearLevel: 1, term: 1, name: 1 });

  const total      = 215;
  const completed  = courses.filter(c => c.status === 'Completed');
  const taking     = courses.filter(c => c.status === 'Taking');
  const pending    = courses.filter(c => c.status === 'Pending');
  const retake     = courses.filter(c => c.status === 'Retake');
  const remedial   = courses.filter(c => c.status === 'Remedial');
  const toTake     = courses.filter(c => c.status === 'To Take');
  const compUnits  = completed.reduce((s, c) => s + (c.units || 0), 0);
  const progress   = compUnits > 0 ? Math.round((compUnits / total) * 100) : 0;

  const byName = arr => [...arr].sort((a, b) => a.name.localeCompare(b.name));

  res.render('dashboard/index', {
    stats: {
      total, compUnits, progress,
      completed: completed.length,
      taking:    taking.length,
      pending:   pending.length,
      retake: retake.length + remedial.length,
      toTake:    toTake.length
    },
    currentCourses:  byName(taking),
    pendingCourses:  byName(pending),
    retakeCourses:   byName(retake),
    remedialCourses: byName(remedial),
  });
});

module.exports = router;