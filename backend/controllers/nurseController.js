const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');
const { nextId } = require('../utils/sequences');

// ---------- Nurses ----------
exports.getNurses = async (req, res) => {
  try {
    const { search, department, isActive } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nurseId: { contains: search } },
        { code: { contains: search } },
      ];
    }
    if (department) where.department = department;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const nurses = await prisma.nurse.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(toApi(nurses));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNurse = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const nurse = await prisma.nurse.findUnique({ where: { id } });
    if (!nurse) return res.status(404).json({ message: 'Nurse not found' });
    res.json(toApi(nurse));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createNurse = async (req, res) => {
  try {
    const data = { ...req.body };
    data.nurseId = data.nurseId || await nextId('NUR');
    if (data.joinDate) data.joinDate = new Date(data.joinDate);
    const nurse = await prisma.nurse.create({ data });
    res.status(201).json(toApi(nurse));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateNurse = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    if (data.joinDate) data.joinDate = new Date(data.joinDate);
    const nurse = await prisma.nurse.update({ where: { id }, data });
    res.json(toApi(nurse));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteNurse = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.nurse.delete({ where: { id } });
    res.json({ message: 'Nurse deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Duty Schedule ----------
exports.getDutySchedules = async (req, res) => {
  try {
    const { date, nurseId } = req.query;
    const nurses = await prisma.nurse.findMany({
      where: nurseId ? { id: parseInt(nurseId, 10) } : { isActive: true },
      orderBy: { name: 'asc' },
    });
    const schedule = nurses.map((n) => {
      const duties = (n.dutySchedule || []).filter((d) => !date || d.date === date);
      return { nurse: toApi(n), duties };
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Body: { nurseId, date, shift, ward, dutyType }
exports.setDuty = async (req, res) => {
  try {
    const { nurseId, date, shift, ward, dutyType } = req.body;
    const nurse = await prisma.nurse.findUnique({ where: { id: parseInt(nurseId, 10) } });
    if (!nurse) return res.status(404).json({ message: 'Nurse not found' });

    const schedule = nurse.dutySchedule || [];
    const existingIndex = schedule.findIndex((d) => d.date === date && d.shift === shift);
    const entry = { date, shift, ward: ward || '', dutyType: dutyType || 'Duty' };
    if (existingIndex >= 0) schedule[existingIndex] = entry;
    else schedule.push(entry);

    const updated = await prisma.nurse.update({
      where: { id: nurse.id },
      data: { dutySchedule: schedule },
    });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeDuty = async (req, res) => {
  try {
    const { nurseId, date, shift } = req.body;
    const nurse = await prisma.nurse.findUnique({ where: { id: parseInt(nurseId, 10) } });
    if (!nurse) return res.status(404).json({ message: 'Nurse not found' });

    const schedule = (nurse.dutySchedule || []).filter((d) => !(d.date === date && d.shift === shift));
    const updated = await prisma.nurse.update({ where: { id: nurse.id }, data: { dutySchedule: schedule } });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
