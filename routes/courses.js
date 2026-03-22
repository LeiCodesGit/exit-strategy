const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Course  = require('../models/Course');

// Suggestion engine
function computeSuggestions(courses) {
  const completedSet = new Set(courses.filter(c => c.status === 'Completed').map(c => c.code));
  const activeSet    = new Set(courses.filter(c => ['Taking','Pending','Retake','Remedial'].includes(c.status)).map(c => c.code));
  const candidates   = courses.filter(c => c.status === 'To Take');

  const scored = candidates.map(c => {
    const prereqs        = c.prerequisites ? c.prerequisites.split(',').map(p => p.trim()).filter(Boolean) : [];
    const missingPrereqs = prereqs.filter(p => !completedSet.has(p));
    if (missingPrereqs.length > 0) return null; // locked

    let score   = 0;
    let reasons = [];

    const isLab      = /L(-\d+)?$/.test(c.code) || c.code.includes('L-');
    const isCritical = ['ECE101-3','MATH800E','CPE801E','RES101','CPE802E','CAP200D','CPE199R-1','CPE803E','CPE198-3','CPE198-4'].includes(c.code);
    const isExitExam = c.code.includes('E') && (c.code.includes('800') || c.code.includes('801') || c.code.includes('802') || c.code.includes('803'));

    if (isCritical) { score += 50; reasons.push('Critical path'); }
    if (isExitExam) { score += 30; reasons.push('Exit exam — take ASAP'); }

    // Boost courses that unlock many others
    const unlockCount = courses.filter(other => {
      if (!other.prerequisites) return false;
      return other.prerequisites.split(',').map(p => p.trim()).includes(c.code);
    }).length;
    if (unlockCount >= 3) { score += unlockCount * 8; reasons.push(`Unlocks ${unlockCount} courses`); }
    else if (unlockCount > 0) { score += unlockCount * 4; }

    if (prereqs.length > 0) score += 10;

    // Higher year = more urgent
    const yearScore = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
    score += (yearScore[c.yearLevel] || 0) * 5;

    // Boost lab if paired lecture is active or done
    if (isLab) {
      const lectureCode = c.code.replace(/L(-\d+)?$/, '$1').replace('L-', '-');
      if (activeSet.has(lectureCode) || completedSet.has(lectureCode)) {
        score += 20;
        reasons.push('Paired with active lecture');
      }
    }

    // Boost if co-requisite is available
    if (c.coRequisites) {
      const coReqs = c.coRequisites.split(',').map(p => p.trim()).filter(Boolean);
      if (coReqs.some(cr => activeSet.has(cr) || completedSet.has(cr))) {
        score += 15;
        reasons.push('Co-req available');
      }
    }

    if (c.units === 3) score += 3;
    if (reasons.length === 0) reasons.push('Prerequisites met');

    return { course: c, score, reasons, unlockCount };
  }).filter(Boolean);

  scored.sort((a, b) => b.score - a.score);

  const urgent      = scored.filter(s => s.score >= 50).slice(0, 5);
  const recommended = scored.filter(s => s.score >= 15 && s.score < 50).slice(0, 8);
  const available   = scored.filter(s => s.score < 15).slice(0, 6);

  // Courses still locked — show what's missing
  const blocked = candidates.map(c => {
    const prereqs = c.prerequisites ? c.prerequisites.split(',').map(p => p.trim()).filter(Boolean) : [];
    const missing = prereqs.filter(p => !completedSet.has(p));
    if (missing.length === 0) return null;
    return { course: c, missing };
  }).filter(Boolean).slice(0, 6);

  return { urgent, recommended, available, blocked };
}

router.get('/', auth, async (req, res) => {
  const userId = req.session.user.id;
  const { year, term, status } = req.query;
  const filter = { userId };
  if (year)   filter.yearLevel = year;
  if (term)   filter.term = term;
  if (status) filter.status = status;

  const courses    = await Course.find(filter).sort({ yearLevel: 1, term: 1, name: 1 });
  const allCourses = await Course.find({ userId }).lean(); // full set needed for suggestions

  const yearOrder = ['1st Year','2nd Year','3rd Year','4th Year'];
  const termOrder = ['1st','2nd','3rd'];
  const grouped   = {};

  courses.forEach(c => {
    if (!grouped[c.yearLevel]) grouped[c.yearLevel] = {};
    if (!grouped[c.yearLevel][c.term]) grouped[c.yearLevel][c.term] = [];
    grouped[c.yearLevel][c.term].push(c);
  });

  const suggestions = computeSuggestions(allCourses);

  res.render('courses/index', {
    grouped, yearOrder, termOrder,
    filters: { year, term, status },
    statuses: ['Completed','Taking','Pending','Remedial','Retake','To Take'],
    suggestions
  });
});

// Get single course for edit prefill
router.get('/:id', auth, async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, userId: req.session.user.id });
  if (!course) return res.status(404).json({ error: 'Not found' });
  res.json(course);
});

// Update course status
router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes, waiver } = req.body;
    const course = await Course.findOne({ _id: req.params.id, userId: req.session.user.id });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    if (!waiver && status === 'Taking' && course.prerequisites) {
      const prereqCodes = course.prerequisites.split(',').map(p => p.trim()).filter(Boolean);
      if (prereqCodes.length > 0) {
        const prereqCourses = await Course.find({ userId: req.session.user.id, code: { $in: prereqCodes } });
        const notCompleted  = prereqCourses.filter(p => p.status !== 'Completed');
        if (notCompleted.length > 0) {
          return res.json({
            success: false,
            prereqError: true,
            missing: notCompleted.map(p => p.code).join(', '),
            message: `Prerequisites not completed: ${notCompleted.map(p => p.code).join(', ')}`
          });
        }
      }
    }

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