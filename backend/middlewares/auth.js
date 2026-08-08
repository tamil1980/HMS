const prisma = require('../db/prisma');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const user = await prisma.user.findUnique({ where: { authToken: token } });
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    delete user.password;
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Restricts route to one of the given roles, e.g. requireRole('admin', 'accountant')
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for your role' });
  }
  next();
};

module.exports = { auth, adminOnly, requireRole };
