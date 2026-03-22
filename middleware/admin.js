module.exports = function(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  if (!req.session.user.isAdmin) return res.status(403).render('admin/forbidden');
  next();
};
