const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');

const consultantFields = [
  'name',
  'department',
  'specialization',
  'qualification',
  'phone',
  'email',
  'registrationNumber',
  'consultationFee',
  'followUpFee',
  'isActive',
  'schedule',
  'availability',
];

const pickConsultant = (body) => {
  const data = {};
  for (const field of consultantFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
};

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === 'true' || active === true) where.isActive = true;
    const consultants = await prisma.consultant.findMany({ where, orderBy: { name: 'asc' } });
    res.json(toApi(consultants));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const consultant = await prisma.consultant.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
    res.json(toApi(consultant));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const consultant = await prisma.consultant.create({ data: pickConsultant(req.body) });
    res.status(201).json(toApi(consultant));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const consultant = await prisma.consultant.update({
      where: { id },
      data: pickConsultant(req.body),
    });
    if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
    res.json(toApi(consultant));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const consultant = await prisma.consultant.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
    res.json({ message: 'Consultant deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
