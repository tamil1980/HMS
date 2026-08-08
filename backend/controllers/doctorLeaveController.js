const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');

exports.getLeaves = async (req, res) => {
  try {
    const { doctorId, status, from, to } = req.query;
    const where = {};
    if (doctorId) where.doctorId = parseInt(doctorId, 10);
    if (status) where.status = status;
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }
    const leaves = await prisma.doctorLeave.findMany({
      where,
      include: { doctor: { select: { id: true, name: true, specialization: true } } },
      orderBy: { startDate: 'desc' },
    });
    res.json(toApi(leaves));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createLeave = async (req, res) => {
  try {
    const { doctorId, startDate, endDate, reason, status } = req.body;
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId: parseInt(doctorId, 10),
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        reason,
        status: status || 'Pending',
      },
    });
    res.status(201).json(toApi(leave));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateLeave = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { startDate, endDate, reason, status } = req.body;
    const data = {};
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (reason !== undefined) data.reason = reason;
    if (status) data.status = status;
    const leave = await prisma.doctorLeave.update({ where: { id }, data });
    res.json(toApi(leave));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.doctorLeave.delete({ where: { id } });
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Checks availability of a doctor for a given date range
exports.checkAvailability = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const d = new Date(date);
    const leaves = await prisma.doctorLeave.findMany({
      where: {
        doctorId: parseInt(doctorId, 10),
        status: 'Approved',
        startDate: { lte: d },
        endDate: { gte: d },
      },
    });
    const doctor = await prisma.consultant.findUnique({ where: { id: parseInt(doctorId, 10) } });
    let available = leaves.length === 0;
    let reason = null;
    if (leaves.length > 0) {
      available = false;
      reason = leaves[0].reason || 'On leave';
    }
    const weekday = new Date(date).toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase();
    const schedule = doctor?.schedule || [];
    if (available && schedule.length > 0) {
      const daySchedule = schedule.find((s) => (s.day || '').toLowerCase() === weekday);
      if (daySchedule && daySchedule.slots && daySchedule.slots.length === 0) {
        available = false;
        reason = 'No slots on this day';
      }
    }
    res.json({ available, reason, leaves: toApi(leaves) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
