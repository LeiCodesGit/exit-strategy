const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const courses = await Course.find({ userId }).lean();

  const byCode = {};
  courses.forEach(c => { byCode[c.code] = c; });

  // Build prerequisite map for unlock detection
  const completedCodes = new Set(
    courses.filter(c => c.status === 'Completed').map(c => c.code)
  );

  // Determine unlocked courses (all prereqs completed)
  courses.forEach(c => {
    if (c.status !== 'To Take') { c._unlocked = true; return; }
    if (!c.prerequisites || c.prerequisites.trim() === '') { c._unlocked = true; return; }
    const prereqs = c.prerequisites.split(',').map(p => p.trim()).filter(Boolean);
    c._unlocked = prereqs.every(p => completedCodes.has(p));
  });

  // Stats
  const total = 215;
  const completed = courses.filter(c => c.status === 'Completed');
  const taking = courses.filter(c => c.status === 'Taking');
  const toTake = courses.filter(c => c.status === 'To Take' || c.status === 'Pending');
  const compUnits = completed.reduce((s, c) => s + (c.units || 0), 0);
  const remainingUnits = total - compUnits;

  // Category breakdown for requirements checklist
  const categories = [
  {
    name: 'Mathematics',
    codes: ['MATH031','MATH035','MATH041','MATH042','MATH056','MATH116','MATH161','MATH161L','MATH800E'],
    color: '#3498db'
  },
  {
    name: 'Core CPE',
    codes: courses.filter(c =>
      (c.code.startsWith('CPE') || c.code.startsWith('CS') || c.code.startsWith('DS')) &&
      !c.code.includes('ELEC') &&
      !['CPE801E','CPE802E','CPE803E','CPE800E','CPE198-3','CPE198-4','CPE191F-1','CPE199R-1'].includes(c.code)
    ).map(c => c.code),
    color: '#e67e22'
  },
  {
    name: 'Electronics / ECE',
    codes: courses.filter(c => c.code.startsWith('ECE') || c.code.startsWith('EE')).map(c => c.code),
    color: '#9b59b6'
  },
  {
    name: 'General Education',
    codes: ['SS021','SS038','SS085','SS022','SS023','HUM021','HUM034','HUM039','ENG023','ENG024','ENG041','PE001','PE002','PE003','PE004','NSTP010','NSTP011P','VE021','VE022','VE023','ACT099','EENV102','TEC100-2','EMGT100','EMGT100L','EECO102','NETA172P-1'],
    color: '#2ecc71'
  },
  {
    name: 'Capstone / Research',
    codes: ['RES101','CAP200D','CAP200D-1','CAP200D-2'],
    color: '#e74c3c'
  },
  {
    name: 'Exit Exams',
    codes: ['MATH800E','CPE801E','CPE802E','CPE803E','CPE198-3','CPE198-4'],
    color: '#f39c12'
  },
  {
    name: 'Electives',
    codes: courses.filter(c => c.code.includes('ELEC') || c.code === 'GEELEC01' || c.code === 'GEELEC02').map(c => c.code),
    color: '#1abc9c'
  },
  {
    name: 'Practicum / Field',
    codes: ['CPE191F-1','CPE199R-1','SGE101','SAF102'],
    color: '#f39c12'
  },
];

  const checklist = categories.map(cat => {
    const catCourses = cat.codes.map(code => byCode[code]).filter(Boolean);
    const done = catCourses.filter(c => c.status === 'Completed').length;
    return { ...cat, total: catCourses.length, done, pct: catCourses.length ? Math.round((done / catCourses.length) * 100) : 0 };
  });

  res.render('roadmap/index', {
    courses: JSON.stringify(courses),
    stats: { total, compUnits, remainingUnits, completed: completed.length, taking: taking.length, toTake: toTake.length },
    checklist
  });
});

module.exports = router;
