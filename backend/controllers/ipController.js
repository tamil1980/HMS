const prisma = require('../db/prisma');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');
const { computeBillTotals, buildBillStatus, dateRange } = require('../utils/billing');

const toInt = (v) => parseInt(v, 10);

const patientBrief = { id: true, name: true, phone: true, patientId: true, age: true, gender: true };
const consultantBrief = { id: true, name: true, specialization: true };

const DAY_MS = 86400000;

// Number of billed room days for an admission (>= 1). While admitted it counts up
// to today; once discharged it counts up to the discharge date.
const roomDays = (admission, now = new Date()) => {
  const start = admission.admissionDate ? new Date(admission.admissionDate) : now;
  const end = admission.status === 'Discharged' && admission.dischargeDate ? new Date(admission.dischargeDate) : now;
  if (end < start) return 1;
  return Math.max(1, Math.ceil((end - start) / DAY_MS));
};

// Keep the admission's auto room-charge bill in sync with room type/rate and
// elapsed days. Creates the bill on first room setup and updates it on edits,
// day changes, and discharge. Non-room items already on the bill are preserved.
const syncRoomCharge = async (admission) => {
  const rate = Number(admission.roomRate) || 0;
  const existing = await prisma.iPBill.findFirst({ where: { admissionId: admission.id, isAuto: true } });

  if (rate <= 0) {
    if (existing && Number(existing.amountPaid) <= 0) {
      await prisma.iPBill.delete({ where: { id: existing.id } }).catch(() => {});
    }
    return;
  }

  const days = roomDays(admission);
  const item = {
    name: `Room - ${admission.roomType || admission.wardName || 'General'}`,
    category: 'Room',
    quantity: days,
    rate,
    gstRate: 0,
    amount: Math.round(days * rate * 100) / 100,
  };

  if (existing) {
    const items = (Array.isArray(existing.items) ? existing.items : []).filter(it => it.category !== 'Room');
    items.push(item);
    const totals = computeBillTotals({ items, discount: existing.discount, discountType: existing.discountType, gstRate: existing.gstRate });
    await prisma.iPBill.update({
      where: { id: existing.id },
      data: {
        items,
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        tax: totals.tax,
        grandTotal: totals.grandTotal,
        amountDue: Math.round((totals.grandTotal - Number(existing.amountPaid)) * 100) / 100,
        status: buildBillStatus(totals.grandTotal, existing.amountPaid),
      },
    });
    return;
  }

  const component = await prisma.iPBillComponent.findFirst({
    where: { category: 'Room', name: admission.roomType, isActive: true },
  }).catch(() => null);
  const gstRate = component && Number(component.gstRate) > 0 ? Number(component.gstRate) : 0;
  item.gstRate = gstRate;
  const totals = computeBillTotals({ items: [item], discount: 0, discountType: 'fixed', gstRate });
  await prisma.iPBill.create({
    data: {
      billId: await nextId('IPB', 5),
      admissionId: admission.id,
      patientId: admission.patientId,
      items: [item],
      subtotal: totals.subtotal,
      discount: 0,
      discountType: 'fixed',
      gstRate,
      cgst: totals.cgst,
      sgst: totals.sgst,
      tax: totals.tax,
      grandTotal: totals.grandTotal,
      amountPaid: 0,
      amountDue: totals.grandTotal,
      status: buildBillStatus(totals.grandTotal, 0),
      isAuto: true,
    },
  });
};

const admissionInclude = {
  patient: { select: { ...patientBrief, bloodGroup: true } },
  consultant: { select: consultantBrief },
  _count: { select: { ipBills: true, ipCaseSheets: true, monitoring: true } },
};

// ---- IP Admissions ----

const admissionFields = [
  'admissionDate',
  'admissionType',
  'wardId',
  'roomId',
  'bedId',
  'wardName',
  'bedNumber',
  'roomType',
  'roomRate',
  'status',
  'provisionalDiagnosis',
  'referredBy',
  'insuranceProvider',
  'insuranceNumber',
  'insuranceType',
  'transfers',
  'dischargeDate',
  'dischargeType',
  'notes',
];

const pickAdmission = (body) => {
  const data = {};
  for (const field of admissionFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.admissionDate === '' || data.admissionDate === null || data.admissionDate === undefined) delete data.admissionDate;
  else if (!(data.admissionDate instanceof Date)) data.admissionDate = new Date(data.admissionDate);
  if (data.dischargeDate === '' || data.dischargeDate === null || data.dischargeDate === undefined) data.dischargeDate = null;
  else if (!(data.dischargeDate instanceof Date)) data.dischargeDate = new Date(data.dischargeDate);
  return data;
};

exports.getAdmissions = async (req, res) => {
  try {
    const { patient, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    if (fromDate || toDate) where.admissionDate = dateRange(fromDate, toDate);

    const admissions = await prisma.iPAdmission.findMany({
      where,
      include: admissionInclude,
      orderBy: { admissionDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.iPAdmission.count({ where });
    res.json({ admissions: toApi(admissions), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdmissionById = async (req, res) => {
  try {
    let admission = await prisma.iPAdmission.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true, bloodGroup: true } },
        consultant: { select: { ...consultantBrief, qualification: true } },
        dischargeSummary: { include: { consultant: { select: consultantBrief } } },
      },
    });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    await syncRoomCharge(admission).catch(err => console.error('[roomCharge] sync error:', err.message));
    admission = await prisma.iPAdmission.findUnique({ where: { id: admission.id }, include: { dischargeSummary: true } });

    const days = roomDays(admission);
    const roomCharge = Number(admission.roomRate || 0) * days;
    res.json(toApi({ ...admission, roomDays: days, roomCharge: Math.round(roomCharge * 100) / 100 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createAdmission = async (req, res) => {
  try {
    const data = pickAdmission(req.body);
    data.patientId = toInt(req.body.patient);
    data.consultantId = req.body.consultant ? toInt(req.body.consultant) : null;
    data.admissionId = await nextId('IP', 5);

    const admission = await prisma.iPAdmission.create({ data, include: { patient: { select: patientBrief } } });
    await syncRoomCharge(admission).catch(err => console.error('[roomCharge] sync error:', err.message));
    res.status(201).json(toApi(admission));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAdmission = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pickAdmission(req.body);
    if (req.body.patient !== undefined) data.patientId = toInt(req.body.patient);
    if (req.body.consultant !== undefined) data.consultantId = req.body.consultant ? toInt(req.body.consultant) : null;

    const admission = await prisma.iPAdmission.update({
      where: { id },
      data,
      include: { patient: { select: patientBrief } },
    });
    await syncRoomCharge(admission).catch(err => console.error('[roomCharge] sync error:', err.message));
    res.json(toApi(admission));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeAdmission = async (req, res) => {
  try {
    const admission = await prisma.iPAdmission.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    res.json({ message: 'Admission deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Discharge an admission: sets status + discharge date
exports.dischargeAdmission = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const admission = await prisma.iPAdmission.update({
      where: { id },
      data: {
        status: 'Discharged',
        dischargeDate: req.body.dischargeDate ? new Date(req.body.dischargeDate) : new Date(),
        dischargeType: req.body.dischargeType || null,
      },
    });
    await syncRoomCharge(admission).catch(err => console.error('[roomCharge] sync error:', err.message));
    res.json(toApi(admission));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- Bed allocation / transfer ----

const bedDetails = async (bedId) => {
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: { room: { include: { ward: true } } },
  });
  if (!bed) return null;
  return {
    bed,
    room: bed.room,
    ward: bed.room.ward,
  };
};

// Assigns a bed to an admission; releases any previously occupied bed.
exports.allocateBed = async (req, res) => {
  try {
    const admissionId = parseInt(req.params.id, 10);
    const bedId = parseInt(req.body.bedId, 10);
    const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    const info = await bedDetails(bedId);
    if (!info) return res.status(404).json({ message: 'Bed not found' });
    if (info.bed.status === 'Occupied') return res.status(400).json({ message: 'Bed is already occupied' });
    if (admission.bedId && admission.bedId !== bedId) {
      await prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'Available' } });
    }

    await prisma.bed.update({ where: { id: bedId }, data: { status: 'Occupied' } });
    const updated = await prisma.iPAdmission.update({
      where: { id: admissionId },
      data: {
        bedId,
        roomId: info.room.id,
        wardId: info.ward.id,
        wardName: info.ward.name,
        bedNumber: info.bed.bedNumber,
        roomType: info.room.type,
        roomRate: Number(info.room.rate) || 0,
      },
    });
    await syncRoomCharge(updated).catch(err => console.error('[roomCharge] sync error:', err.message));
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Transfers an admitted patient to another bed, preserving history.
exports.transferBed = async (req, res) => {
  try {
    const admissionId = parseInt(req.params.id, 10);
    const toBedId = parseInt(req.body.bedId, 10);
    const reason = req.body.reason || '';
    const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    const info = await bedDetails(toBedId);
    if (!info) return res.status(404).json({ message: 'Target bed not found' });
    if (info.bed.status === 'Occupied') return res.status(400).json({ message: 'Target bed is already occupied' });

    const transfers = Array.isArray(admission.transfers) ? admission.transfers : [];
    if (admission.bedId) {
      transfers.push({
        fromBed: admission.bedNumber || '',
        fromWard: admission.wardName || '',
        toBed: info.bed.bedNumber,
        toWard: info.ward.name,
        reason,
        date: new Date().toISOString(),
        by: req.user && req.user.name,
      });
      await prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'Available' } });
    }
    await prisma.bed.update({ where: { id: toBedId }, data: { status: 'Occupied' } });

    const updated = await prisma.iPAdmission.update({
      where: { id: admissionId },
      data: {
        bedId: toBedId,
        roomId: info.room.id,
        wardId: info.ward.id,
        wardName: info.ward.name,
        bedNumber: info.bed.bedNumber,
        roomType: info.room.type,
        roomRate: Number(info.room.rate) || 0,
        transfers,
      },
    });
    await syncRoomCharge(updated).catch(err => console.error('[roomCharge] sync error:', err.message));
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Releases the bed on discharge.
exports.releaseBed = async (req, res) => {
  try {
    const admissionId = parseInt(req.params.id, 10);
    const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (admission.bedId) {
      await prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'Available' } });
    }
    const updated = await prisma.iPAdmission.update({
      where: { id: admissionId },
      data: { bedId: null, roomId: null, wardId: null },
    });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- IP Bill Components ----

const componentFields = ['code', 'name', 'category', 'rate', 'gstRate', 'unit', 'isActive'];

const pickComponent = (body) => {
  const data = {};
  for (const field of componentFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
};

exports.getComponents = async (req, res) => {
  try {
    const { category, active } = req.query;
    const where = {};
    if (category) where.category = category;
    if (active === 'true' || active === true) where.isActive = true;
    const components = await prisma.iPBillComponent.findMany({ where, orderBy: { name: 'asc' } });
    res.json(toApi(components));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createComponent = async (req, res) => {
  try {
    const data = pickComponent(req.body);
    data.code = data.code || undefined;
    const component = await prisma.iPBillComponent.create({ data });
    res.status(201).json(toApi(component));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateComponent = async (req, res) => {
  try {
    const component = await prisma.iPBillComponent.update({
      where: { id: parseInt(req.params.id, 10) },
      data: pickComponent(req.body),
    });
    if (!component) return res.status(404).json({ message: 'Component not found' });
    res.json(toApi(component));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeComponent = async (req, res) => {
  try {
    const component = await prisma.iPBillComponent.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!component) return res.status(404).json({ message: 'Component not found' });
    res.json({ message: 'Component deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- IP Bills ----

const billBase = (body) => {
  const data = {};
  const fields = ['billDate', 'items', 'discount', 'discountType', 'gstRate', 'notes'];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.billDate === '' || data.billDate === null || data.billDate === undefined) delete data.billDate;
  else if (!(data.billDate instanceof Date)) data.billDate = new Date(data.billDate);
  return data;
};

exports.getBills = async (req, res) => {
  try {
    const { admission, patient, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (admission) where.admissionId = toInt(admission);
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    if (fromDate || toDate) where.billDate = dateRange(fromDate, toDate);

    const bills = await prisma.iPBill.findMany({
      where,
      include: {
        patient: { select: patientBrief },
        admission: { select: { id: true, admissionId: true, wardName: true, bedNumber: true } },
      },
      orderBy: { billDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.iPBill.count({ where });
    res.json({ bills: toApi(bills), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await prisma.iPBill.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true } },
        admission: { select: { id: true, admissionId: true, wardName: true, bedNumber: true, admissionType: true } },
      },
    });
    if (!bill) return res.status(404).json({ message: 'IP bill not found' });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { items, discount, discountType, gstRate } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Add at least one item' });
    const admissionId = toInt(req.body.admission);
    if (!admissionId) return res.status(400).json({ message: 'Admission is required' });

    const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
    if (!admission) return res.status(400).json({ message: 'Admission not found' });

    const totals = computeBillTotals({ items, discount, discountType, gstRate });
    const amountPaid = Number(req.body.amountPaid) || 0;
    const payment = req.body.paymentMode && amountPaid > 0
      ? { mode: req.body.paymentMode, amount: amountPaid, reference: req.body.reference || undefined }
      : null;

    const data = billBase(req.body);
    data.admissionId = admissionId;
    data.patientId = admission.patientId;
    data.subtotal = totals.subtotal;
    data.discount = totals.discount;
    data.discountType = discountType || 'fixed';
    data.gstRate = Number(gstRate) || 0;
    data.cgst = totals.cgst;
    data.sgst = totals.sgst;
    data.tax = totals.tax;
    data.grandTotal = totals.grandTotal;
    data.amountPaid = amountPaid;
    data.amountDue = Math.round((totals.grandTotal - amountPaid) * 100) / 100;
    data.status = buildBillStatus(totals.grandTotal, amountPaid);
    data.paymentMode = payment ? payment.mode : null;
    data.payments = payment ? [payment] : [];
    data.billId = await nextId('IPB', 5);

    const bill = await prisma.iPBill.create({ data, include: { patient: { select: patientBrief } } });
    res.status(201).json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.iPBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'IP bill not found' });

    const items = req.body.items || existing.items;
    const totals = computeBillTotals({
      items,
      discount: req.body.discount ?? existing.discount,
      discountType: req.body.discountType || existing.discountType,
      gstRate: req.body.gstRate ?? existing.gstRate,
    });
    const amountPaid = Number(req.body.amountPaid ?? existing.amountPaid) || 0;

    const data = billBase(req.body);
    if (req.body.admission !== undefined) {
      const admissionId = toInt(req.body.admission);
      const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
      if (!admission) return res.status(400).json({ message: 'Admission not found' });
      data.admissionId = admissionId;
      data.patientId = admission.patientId;
    }
    data.items = items;
    data.subtotal = totals.subtotal;
    data.discount = totals.discount;
    data.discountType = req.body.discountType || existing.discountType;
    data.gstRate = req.body.gstRate ?? existing.gstRate;
    data.cgst = totals.cgst;
    data.sgst = totals.sgst;
    data.tax = totals.tax;
    data.grandTotal = totals.grandTotal;
    data.amountPaid = amountPaid;
    data.amountDue = Math.round((totals.grandTotal - amountPaid) * 100) / 100;
    data.status = buildBillStatus(totals.grandTotal, amountPaid);

    const bill = await prisma.iPBill.update({ where: { id }, data });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeBill = async (req, res) => {
  try {
    const bill = await prisma.iPBill.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!bill) return res.status(404).json({ message: 'IP bill not found' });
    res.json({ message: 'IP bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bill = await prisma.iPBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ message: 'IP bill not found' });

    const { mode, amount, reference } = req.body;
    const payments = Array.isArray(bill.payments) ? bill.payments : [];
    payments.push({ mode, amount: Number(amount) || 0, reference: reference || '', date: new Date().toISOString() });

    const amountPaid = Math.round((Number(bill.amountPaid) + (Number(amount) || 0)) * 100) / 100;
    const amountDue = Math.round((Number(bill.grandTotal) - amountPaid) * 100) / 100;
    const status = amountDue <= 0 ? 'Paid' : 'Partial';

    const updated = await prisma.iPBill.update({
      where: { id },
      data: { payments, amountPaid, amountDue, status, paymentMode: mode },
    });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadBillPDF = async (req, res) => {
  try {
    const bill = await prisma.iPBill.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true, admission: true },
    });
    if (!bill) return res.status(404).json({ message: 'IP bill not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generateIPBillPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=IPBill_${bill.billId}.pdf`);
    await generateIPBillPDF(bill, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- IP Monitoring ----

const monitoringFields = [
  'recordedAt',
  'recordedBy',
  'temperature',
  'pulse',
  'respiration',
  'bloodPressure',
  'spo2',
  'weight',
  'urineOutput',
  'fluidIntake',
  'glucose',
  'notes',
];

const pickMonitoring = (body) => {
  const data = {};
  for (const field of monitoringFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.recordedAt === '' || data.recordedAt === null || data.recordedAt === undefined) delete data.recordedAt;
  else if (!(data.recordedAt instanceof Date)) data.recordedAt = new Date(data.recordedAt);
  return data;
};

exports.getMonitoring = async (req, res) => {
  try {
    const { admission } = req.query;
    const where = {};
    if (admission) where.admissionId = toInt(admission);
    const records = await prisma.iPMonitoring.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      include: { admission: { select: { id: true, admissionId: true, wardName: true, bedNumber: true } } },
    });
    res.json(toApi(records));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createMonitoring = async (req, res) => {
  try {
    const admissionId = toInt(req.body.admission);
    if (!admissionId) return res.status(400).json({ message: 'Admission is required' });
    const data = pickMonitoring(req.body);
    data.admissionId = admissionId;
    const record = await prisma.iPMonitoring.create({ data });
    res.status(201).json(toApi(record));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMonitoring = async (req, res) => {
  try {
    const record = await prisma.iPMonitoring.update({
      where: { id: parseInt(req.params.id, 10) },
      data: pickMonitoring(req.body),
    });
    if (!record) return res.status(404).json({ message: 'Monitoring record not found' });
    res.json(toApi(record));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeMonitoring = async (req, res) => {
  try {
    const record = await prisma.iPMonitoring.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!record) return res.status(404).json({ message: 'Monitoring record not found' });
    res.json({ message: 'Monitoring record deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- IP Case Sheets ----

const ipCaseSheetFields = ['date', 'shift', 'complaints', 'history', 'examination', 'diagnosis', 'investigations', 'vitals', 'prescriptions', 'treatmentPlan', 'notes', 'isActive'];

const pickIPCaseSheet = (body) => {
  const data = {};
  for (const field of ipCaseSheetFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.date === '' || data.date === null || data.date === undefined) delete data.date;
  else if (!(data.date instanceof Date)) data.date = new Date(data.date);
  return data;
};

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

exports.getIPCaseSheets = async (req, res) => {
  try {
    const { admission, patient, page = 1, limit = 20 } = req.query;
    const where = {};
    if (admission) where.admissionId = toInt(admission);
    if (patient) where.patientId = toInt(patient);

    const caseSheets = await prisma.iPCaseSheet.findMany({
      where,
      include: {
        patient: { select: patientBrief },
        consultant: { select: consultantBrief },
        admission: { select: { id: true, admissionId: true, wardName: true, bedNumber: true } },
      },
      orderBy: { date: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.iPCaseSheet.count({ where });
    res.json({ caseSheets: toApi(caseSheets), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getIPCaseSheetById = async (req, res) => {
  try {
    const caseSheet = await prisma.iPCaseSheet.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true } },
        consultant: { select: { ...consultantBrief, qualification: true } },
        admission: { select: { id: true, admissionId: true, wardName: true, bedNumber: true } },
      },
    });
    if (!caseSheet) return res.status(404).json({ message: 'IP case sheet not found' });
    res.json(toApi(caseSheet));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createIPCaseSheet = async (req, res) => {
  try {
    const admissionId = toInt(req.body.admission);
    if (!admissionId) return res.status(400).json({ message: 'Admission is required' });
    const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
    if (!admission) return res.status(400).json({ message: 'Admission not found' });

    const data = pickIPCaseSheet(req.body);
    data.admissionId = admissionId;
    data.patientId = admission.patientId;
    data.consultantId = req.body.consultant ? toInt(req.body.consultant) : admission.consultantId || null;
    data.caseSheetId = await nextId('IPCS', 5);

    const caseSheet = await prisma.iPCaseSheet.create({ data });
    try {
      await adjustStock(data.prescriptions, -1);
    } catch (stockErr) {
      console.error('[ipCaseSheet] stock adjust error:', stockErr.message);
    }
    res.status(201).json(toApi(caseSheet));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateIPCaseSheet = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pickIPCaseSheet(req.body);
    if (req.body.consultant !== undefined) data.consultantId = req.body.consultant ? toInt(req.body.consultant) : null;

    const existing = await prisma.iPCaseSheet.findUnique({ where: { id }, select: { prescriptions: true } });
    const caseSheet = await prisma.iPCaseSheet.update({ where: { id }, data });
    try {
      await adjustStock(existing && existing.prescriptions, 1);
      await adjustStock(data.prescriptions, -1);
    } catch (stockErr) {
      console.error('[ipCaseSheet] stock adjust error:', stockErr.message);
    }
    if (!caseSheet) return res.status(404).json({ message: 'IP case sheet not found' });
    res.json(toApi(caseSheet));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeIPCaseSheet = async (req, res) => {
  try {
    const caseSheet = await prisma.iPCaseSheet.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!caseSheet) return res.status(404).json({ message: 'IP case sheet not found' });
    res.json({ message: 'IP case sheet deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadIPCaseSheetPDF = async (req, res) => {
  try {
    const caseSheet = await prisma.iPCaseSheet.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true, consultant: true, admission: true },
    });
    if (!caseSheet) return res.status(404).json({ message: 'IP case sheet not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generateIPCaseSheetPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=IPCaseSheet_${caseSheet.caseSheetId}.pdf`);
    await generateIPCaseSheetPDF(caseSheet, caseSheet.patient, caseSheet.consultant, caseSheet.admission, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- IP Discharge Summary ----

const dischargeFields = [
  'dischargeDate',
  'admittingDiagnosis',
  'finalDiagnosis',
  'conditionAtDischarge',
  'treatmentGiven',
  'investigationSummary',
  'procedureDone',
  'medicationsAtDischarge',
  'followUpAdvice',
  'dietAdvice',
  'dischargeInstructions',
  'referredTo',
];

const pickDischarge = (body) => {
  const data = {};
  for (const field of dischargeFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.dischargeDate === '' || data.dischargeDate === null || data.dischargeDate === undefined) delete data.dischargeDate;
  else if (!(data.dischargeDate instanceof Date)) data.dischargeDate = new Date(data.dischargeDate);
  return data;
};

exports.getDischargeSummaries = async (req, res) => {
  try {
    const { admission, page = 1, limit = 20 } = req.query;
    const where = {};
    if (admission) where.admissionId = toInt(admission);

    const summaries = await prisma.iPDischargeSummary.findMany({
      where,
      include: {
        admission: {
          include: {
            patient: { select: patientBrief },
            consultant: { select: consultantBrief },
          },
        },
        consultant: { select: consultantBrief },
      },
      orderBy: { dischargeDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.iPDischargeSummary.count({ where });
    res.json({ summaries: toApi(summaries), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDischargeSummaryByAdmission = async (req, res) => {
  try {
    const summary = await prisma.iPDischargeSummary.findUnique({
      where: { admissionId: parseInt(req.params.admissionId, 10) },
      include: {
        admission: {
          include: { patient: { select: { ...patientBrief, address: true, bloodGroup: true } } },
        },
        consultant: { select: { ...consultantBrief, qualification: true } },
      },
    });
    if (!summary) return res.status(404).json({ message: 'Discharge summary not found' });
    res.json(toApi(summary));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDischargeSummaryById = async (req, res) => {
  try {
    const summary = await prisma.iPDischargeSummary.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        admission: {
          include: { patient: { select: { ...patientBrief, address: true, bloodGroup: true } } },
        },
        consultant: { select: { ...consultantBrief, qualification: true } },
      },
    });
    if (!summary) return res.status(404).json({ message: 'Discharge summary not found' });
    res.json(toApi(summary));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createDischargeSummary = async (req, res) => {
  try {
    const admissionId = toInt(req.body.admission);
    if (!admissionId) return res.status(400).json({ message: 'Admission is required' });
    const admission = await prisma.iPAdmission.findUnique({ where: { id: admissionId } });
    if (!admission) return res.status(400).json({ message: 'Admission not found' });

    const existing = await prisma.iPDischargeSummary.findUnique({ where: { admissionId } });
    if (existing) return res.status(400).json({ message: 'Discharge summary already exists for this admission' });

    const data = pickDischarge(req.body);
    data.admissionId = admissionId;
    data.consultantId = req.body.consultant ? toInt(req.body.consultant) : admission.consultantId || null;
    data.summaryId = await nextId('IPDS', 5);

    const summary = await prisma.iPDischargeSummary.create({ data });
    await prisma.iPAdmission.update({
      where: { id: admissionId },
      data: { status: 'Discharged', dischargeDate: data.dischargeDate || new Date() },
    });
    res.status(201).json(toApi(summary));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDischargeSummary = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pickDischarge(req.body);
    if (req.body.consultant !== undefined) data.consultantId = req.body.consultant ? toInt(req.body.consultant) : null;

    const summary = await prisma.iPDischargeSummary.update({ where: { id }, data });
    if (!summary) return res.status(404).json({ message: 'Discharge summary not found' });
    res.json(toApi(summary));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeDischargeSummary = async (req, res) => {
  try {
    const summary = await prisma.iPDischargeSummary.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!summary) return res.status(404).json({ message: 'Discharge summary not found' });
    res.json({ message: 'Discharge summary deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadDischargePDF = async (req, res) => {
  try {
    const summary = await prisma.iPDischargeSummary.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        admission: { include: { patient: true } },
        consultant: true,
      },
    });
    if (!summary) return res.status(404).json({ message: 'Discharge summary not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generateDischargeSummaryPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=DischargeSummary_${summary.summaryId}.pdf`);
    await generateDischargeSummaryPDF(summary, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
