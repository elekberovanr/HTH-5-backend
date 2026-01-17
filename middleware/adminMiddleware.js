const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    const user = req.user || await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Bu əməliyyatı yerinə yetirməyə icazəniz yoxdur' });
    }
    req.isAdmin = true;
    next();
  } catch (err) {
    console.error('Admin yoxlaması xətası:', err);
    res.status(500).json({ error: 'Server xətası' });
  }
};

module.exports = adminMiddleware;
