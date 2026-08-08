const prisma = require('../db/prisma');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');
const { dateRange } = require('../utils/billing');

const caseSheetFields = [
  'date',
  'complaints',
  'history',
  'examination',
  'diagnosis',
  'investigations',
  'vitals',
  'prescriptions',
  'advice',
  'nextVisit',
  'isActive',
];

const toInt = (v) => parseInt(v, 10);

// Reduce (+1) or restore (+1) medicine stock based on case sheet prescriptions.
// sign = -1 consumes stock, sign = +1 returns stock back (e.g. on edit).
const adjustStock = async (prescriptions, sign = -1) => {
  for (const p of prescriptions || []) {
    const qty = Number(p && p.quantity) || 0;
    const name = p && p.medicine;
    if (!name || qty <= 0) continue;
    const med = await prisma.medicine.findFirst({ where: { name } });
    if (!med) continue;
    await prisma.medicine.update({
      where: { id: med.id },
      data: { quantity: { increment: sign * qty } },
    });
  }
};

const pickCaseSheet = (body) => {
  const data = {};
  for (const field of caseSheetFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.date === '' || data.date === null || data.date === undefined) delete data.date;
  else if (!(data.date instanceof Date)) data.date = new Date(data.date);
  if (data.nextVisit === '' || data.nextVisit === null || data.nextVisit === undefined) data.nextVisit = null;
  else if (!(data.nextVisit instanceof Date)) data.nextVisit = new Date(data.nextVisit);
  return data;
};

const patientSelect = { id: true, name: true, phone: true, patientId: true, age: true, gender: true };
const consultantSelect = { id: true, name: true, specialization: true };

exports.getAll = async (req, res) => {
  try {
    const { patient, consultant, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (consultant) where.consultantId = toInt(consultant);
    if (fromDate || toDate) where.date = dateRange(fromDate, toDate);

    const caseSheets = await prisma.caseSheet.findMany({
      where,
      include: {
        patient: { select: patientSelect },
        consultant: { select: consultantSelect },
      },
      orderBy: { date: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.caseSheet.count({ where });
    res.json({ caseSheets: toApi(caseSheets), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const caseSheet = await prisma.caseSheet.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientSelect, address: true } },
        consultant: { select: { ...consultantSelect, qualification: true } },
        appointment: { select: { id: true, appointmentDate: true, appointmentTime: true, appointmentId: true } },
      },
    });
    if (!caseSheet) return res.status(404).json({ message: 'Case sheet not found' });
    res.json(toApi(caseSheet));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = pickCaseSheet(req.body);
    data.patientId = toInt(req.body.patient);
    data.consultantId = toInt(req.body.consultant);
    data.appointmentId = req.body.appointment ? toInt(req.body.appointment) : null;
    data.caseSheetId = await nextId('CS', 5);

    const caseSheet = await prisma.caseSheet.create({ data });
    try {
      await adjustStock(data.prescriptions, -1);
    } catch (stockErr) {
      console.error('[caseSheet] stock adjust error:', stockErr.message);
    }
    const populated = await prisma.caseSheet.findUnique({
      where: { id: caseSheet.id },
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        consultant: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pickCaseSheet(req.body);
    if (req.body.patient !== undefined) data.patientId = toInt(req.body.patient);
    if (req.body.consultant !== undefined) data.consultantId = toInt(req.body.consultant);
    if (req.body.appointment !== undefined) data.appointmentId = req.body.appointment ? toInt(req.body.appointment) : null;

    const existing = await prisma.caseSheet.findUnique({ where: { id }, select: { prescriptions: true } });
    const caseSheet = await prisma.caseSheet.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        consultant: { select: { id: true, name: true } },
      },
    });
    try {
      await adjustStock(existing && existing.prescriptions, 1);
      await adjustStock(data.prescriptions, -1);
    } catch (stockErr) {
      console.error('[caseSheet] stock adjust error:', stockErr.message);
    }
    if (!caseSheet) return res.status(404).json({ message: 'Case sheet not found' });
    res.json(toApi(caseSheet));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const caseSheet = await prisma.caseSheet.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!caseSheet) return res.status(404).json({ message: 'Case sheet not found' });
    res.json({ message: 'Case sheet deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const caseSheet = await prisma.caseSheet.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true, consultant: true },
    });
    if (!caseSheet) return res.status(404).json({ message: 'Case sheet not found' });

    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);

    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=CaseSheet_${caseSheet.caseSheetId}.pdf`);

    const { generateCaseSheetPDF } = require('../utils/pdfGenerator');
    await generateCaseSheetPDF(caseSheet, caseSheet.patient, caseSheet.consultant, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getByPatient = async (req, res) => {
  try {
    const caseSheets = await prisma.caseSheet.findMany({
      where: { patientId: parseInt(req.params.patientId, 10) },
      include: { consultant: { select: { id: true, name: true, specialization: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(toApi(caseSheets));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
