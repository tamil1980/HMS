const prisma = require('../db/prisma');
const generateQR = require('../utils/generateQR');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');

const buildPatientQRData = (p) => ({
  patientId: p.patientId,
  name: p.name,
  phone: p.phone,
  email: p.email || '',
  age: p.age,
  gender: p.gender,
  bloodGroup: p.bloodGroup || '',
  address: p.address || '',
  dob: p.dob ? p.dob.toISOString().slice(0, 10) : '',
});

const patientFields = [
  'name',
  'phone',
  'email',
  'age',
  'gender',
  'address',
  'bloodGroup',
  'dob',
  'guardians',
  'medicalHistory',
  'isActive',
];

const pickPatient = (body) => {
  const data = {};
  for (const field of patientFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.dob === '' || data.dob === null || data.dob === undefined) delete data.dob;
  else if (!(data.dob instanceof Date)) data.dob = new Date(data.dob);
  return data;
};

exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { patientId: { contains: search } },
          ],
        }
      : {};
    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.patient.count({ where });
    res.json({ patients: toApi(patients), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(toApi(patient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const patientId = await nextId('PAT', 5);
    const data = { ...pickPatient(req.body), patientId };
    const patient = await prisma.patient.create({ data });
    patient.qrCode = await generateQR(buildPatientQRData(patient));
    await prisma.patient.update({ where: { id: patient.id }, data: { qrCode: patient.qrCode } });
    res.status(201).json(toApi(patient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Patient not found' });

    const data = pickPatient(req.body);
    const patient = await prisma.patient.update({ where: { id }, data });
    patient.qrCode = await generateQR(buildPatientQRData(patient));
    await prisma.patient.update({ where: { id }, data: { qrCode: patient.qrCode } });
    res.json(toApi(patient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const patient = await prisma.patient.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadQR = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    patient.qrCode = await generateQR(buildPatientQRData(patient));
    await prisma.patient.update({ where: { id: patient.id }, data: { qrCode: patient.qrCode } });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generatePatientQRPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=PatientQR_${patient.patientId}.pdf`);
    await generatePatientQRPDF(patient, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
