const prisma = require('../db/prisma');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');

const appointmentFields = ['appointmentDate', 'appointmentTime', 'type', 'status', 'notes'];

const toInt = (v) => parseInt(v, 10);

const pickAppointment = (body) => {
  const data = {};
  for (const field of appointmentFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.appointmentDate === '' || data.appointmentDate === null || data.appointmentDate === undefined) delete data.appointmentDate;
  else if (!(data.appointmentDate instanceof Date)) data.appointmentDate = new Date(data.appointmentDate);
  return data;
};

const dayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const patientSelect = { id: true, name: true, phone: true, patientId: true, age: true, gender: true };
const consultantSelect = { id: true, name: true, specialization: true, consultationFee: true };

exports.getAll = async (req, res) => {
  try {
    const { date, consultant, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (date) {
      const { start, end } = dayRange(date);
      where.appointmentDate = { gte: start, lte: end };
    }
    if (consultant) where.consultantId = toInt(consultant);
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: patientSelect },
        consultant: { select: consultantSelect },
      },
      orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'asc' }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.appointment.count({ where });
    res.json({ appointments: toApi(appointments), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientSelect, address: true } },
        consultant: { select: { ...consultantSelect, qualification: true } },
      },
    });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(toApi(appointment));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const patientId = toInt(req.body.patient);
    const consultantId = toInt(req.body.consultant);
    const { appointmentDate } = req.body;
    const { start, end } = dayRange(new Date(appointmentDate || Date.now()));

    const count = await prisma.appointment.count({
      where: { consultantId, appointmentDate: { gte: start, lte: end } },
    });
    const tokenNumber = count + 1;
    const appointmentId = await nextId('APT', 5);

    const data = { ...pickAppointment(req.body), patientId, consultantId, tokenNumber, appointmentId };
    const appointment = await prisma.appointment.create({ data });
    const populated = await prisma.appointment.findUnique({
      where: { id: appointment.id },
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
    const data = pickAppointment(req.body);
    if (req.body.patient !== undefined) data.patientId = toInt(req.body.patient);
    if (req.body.consultant !== undefined) data.consultantId = toInt(req.body.consultant);

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        consultant: { select: { id: true, name: true } },
      },
    });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(toApi(appointment));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const appointment = await prisma.appointment.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getByPatient = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: parseInt(req.params.patientId, 10) },
      include: { consultant: { select: { id: true, name: true, specialization: true } } },
      orderBy: { appointmentDate: 'desc' },
    });
    res.json(toApi(appointments));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTodayAppointments = async (req, res) => {
  try {
    const { start, end } = dayRange(new Date());
    const appointments = await prisma.appointment.findMany({
      where: { appointmentDate: { gte: start, lte: end } },
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        consultant: { select: { id: true, name: true } },
      },
      orderBy: { appointmentTime: 'asc' },
    });
    res.json(toApi(appointments));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
