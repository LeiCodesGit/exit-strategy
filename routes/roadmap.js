const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const courses = await Course.find({ userId });

  const byCode = {};
  courses.forEach(c => { byCode[c.code] = c; });

  const criticalPath = [
    { code:'ECE101-3',   reason:'Blocks Practicum — must resolve to graduate', priority:'critical' },
    { code:'MATH800E',   reason:'Carry-over — needed for CPE198-3 (4Y1T)',     priority:'high' },
    { code:'CPE801E',    reason:'Carry-over — needed for CPE198-3 (4Y1T)',     priority:'high' },
    { code:'RES101',     reason:'Must pass to unlock Capstone chain',           priority:'high' },
    { code:'CPE108',     reason:'Grade pending — follow up with professor',     priority:'medium' },
    { code:'CPE108L',    reason:'Grade pending — follow up with professor',     priority:'medium' },
    { code:'CPE802E',    reason:'3Y3T — all prereqs met, schedule ASAP',       priority:'medium' },
    { code:'CAP200D',    reason:'Thesis Part 1 — requires RES101',             priority:'low' },
    { code:'CPE199R-1',  reason:'Practicum — requires ECE101-3 cleared',       priority:'low' },
  ].map(item => ({ ...item, course: byCode[item.code] || null }));

  const roadmap = [
    {
      label: '3rd Year · 3rd Term', tag: 'NEXT TERM', color: 'teal',
      note: '4 carry-overs + ECE101-3 remedial — your heaviest term, plan carefully',
      codes: ['ECE101-3','MATH800E','CPE801E','RES101','CPE112-1','CPE112L-1','CPE181','CPE151','CPE151L','CPE802E','CPEELEC01','EENV102','GEELEC02']
    },
    {
      label: '4th Year · 1st Term', tag: '', color: 'blue',
      note: 'Signal Processing, Architecture, Capstone 1 & 2',
      codes: ['CAP200D','CAP200D-1','CPE110-1','CPE113-1','CPE113L-1','CPE131-1','CPE131L-1','CPEELEC02','CPE198-3']
    },
    {
      label: '4th Year · 2nd Term', tag: '', color: 'blue',
      note: 'Final exit exams. Capstone 3 wrap-up.',
      codes: ['CAP200D-2','CPE803E','CPEELEC03','HUM034','SS023','CPE198-4']
    },
    {
      label: '4th Year · 3rd Term', tag: '🎓 GRADUATION', color: 'green',
      note: 'Practicum, Seminars & Global Experience',
      codes: ['CPE191F-1','CPE199R-1','SAF102','SGE101']
    },
  ].map(sem => ({
    ...sem,
    courses: sem.codes.map(code => byCode[code]).filter(Boolean)
  }));

  res.render('roadmap/index', { roadmap, criticalPath });
});

module.exports = router;
