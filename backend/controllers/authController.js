const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');
const { getAmcLockMessage } = require('../utils/amcLock');

const generateToken = () => crypto.randomBytes(32).toString('hex');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const amcLockMessage = await getAmcLockMessage();
    if (amcLockMessage) return res.status(403).json({ message: amcLockMessage, amcLocked: true });

    const token = user.authToken || generateToken();
    if (!user.authToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { authToken: token },
      });
    }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'staff' },
    });
    res.json({ message: 'Registration successful. Please sign in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(toApi(req.user));
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, id: { not: req.user.id } } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
      data.email = email;
    }
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(toApi({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Step 1: request a reset token (simulated email/SMS - returns the token in response)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    const token = crypto.randomBytes(6).toString('hex').toUpperCase();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await prisma.user.update({
      where: { id: user.id },
      data: { forgotPasswordToken: token, forgotPasswordExpiry: expiry },
    });

    // In production this would be sent via email/SMS.
    res.json({ message: 'Reset token sent to your email', devToken: token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Step 2: reset the password with the token
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    if (!user.forgotPasswordToken || user.forgotPasswordToken !== token) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (!user.forgotPasswordExpiry || user.forgotPasswordExpiry < new Date()) {
      return res.status(400).json({ message: 'Token has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, forgotPasswordToken: null, forgotPasswordExpiry: null },
    });
    res.json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(toApi(users));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, role, phone, isActive } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password || '123456', 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'staff', phone, isActive: isActive !== undefined ? !!isActive : true },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.status(201).json(toApi(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, role, phone, isActive, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (phone !== undefined) data.phone = phone;
    if (isActive !== undefined) data.isActive = !!isActive;
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json(toApi(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { authToken: null },
    });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
