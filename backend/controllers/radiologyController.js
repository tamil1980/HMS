const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');
const { nextId } = require('../utils/sequences');
const { computeBillTotals, buildBillStatus, dateRange } = require('../utils/billing');

const toInt = (v) => parseInt(v, 10);

const patientBrief = { id: true, name: true, phone: true, patientId: true, age: true, gender: true };

// ---------- Radiology Tests (catalog) ----------
exports.getTests = async (req, res) => {
  try {
    const { search, category, isActive } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: search } }, { testId: { contains: search } }];
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const tests = await prisma.radiologyTest.findMany({ where, orderBy: { name: 'asc' } });
    res.json(toApi(tests));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTest = async (req, res) => {
  try {
    const { name, category, price, gstRate, preparation, isActive } = req.body;
    const data = { name, category: category || 'X-Ray', price: price || 0, gstRate: gstRate || 0, preparation, isActive };
    data.testId = await nextId('RAD', 5);
    const test = await prisma.radiologyTest.create({ data });
    res.status(201).json(toApi(test));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { name, category, price, gstRate, preparation, isActive } = req.body;
    const test = await prisma.radiologyTest.update({ where: { id }, data: { name, category, price, gstRate, preparation, isActive } });
    res.json(toApi(test));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.radiologyTest.delete({ where: { id } });
    res.json({ message: 'Radiology test deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Radiology Bills (booking) ----------
exports.getBills = async (req, res) => {
  try {
    const { patient, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    if (fromDate || toDate) where.billDate = dateRange(fromDate, toDate);

    const bills = await prisma.radiologyBill.findMany({
      where,
      include: { patient: { select: patientBrief } },
      orderBy: { billDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.radiologyBill.count({ where });
    res.json({ bills: toApi(bills), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await prisma.radiologyBill.findUnique({
      where: { id: toInt(req.params.id) },
      include: { patient: { select: { ...patientBrief, address: true } }, reports: true },
    });
    if (!bill) return res.status(404).json({ message: 'Radiology bill not found' });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { items, discount, discountType, gstRate, referredBy, notes } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Add at least one test' });
    const patientId = toInt(req.body.patient);
    if (!patientId) return res.status(400).json({ message: 'Patient is required' });

    const totals = computeBillTotals({ items, discount, discountType, gstRate });
    const amountPaid = Number(req.body.amountPaid) || 0;
    const payment = req.body.paymentMode && amountPaid > 0
      ? { mode: req.body.paymentMode, amount: amountPaid, reference: req.body.reference || undefined }
      : null;

    const bill = await prisma.radiologyBill.create({
      data: {
        billId: await nextId('RADB', 5),
        patientId,
        referredBy,
        items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountType: discountType || 'fixed',
        gstRate: Number(gstRate) || 0,
        cgst: totals.cgst,
        sgst: totals.sgst,
        tax: totals.tax,
        grandTotal: totals.grandTotal,
        amountPaid,
        amountDue: Math.round((totals.grandTotal - amountPaid) * 100) / 100,
        status: buildBillStatus(totals.grandTotal, amountPaid),
        paymentMode: payment ? payment.mode : null,
        payments: payment ? [payment] : [],
        notes,
      },
      include: { patient: { select: patientBrief } },
    });

    if (payment) {
      await prisma.payment.create({
        data: {
          receiptId: await nextId('PAY', 5),
          patientId,
          billType: 'Radiology',
          billId: bill.id,
          amount: amountPaid,
          mode: payment.mode,
          reference: payment.reference,
        },
      }).catch(() => {});
    }
    res.status(201).json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const existing = await prisma.radiologyBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Radiology bill not found' });

    const items = req.body.items || existing.items;
    const totals = computeBillTotals({
      items,
      discount: req.body.discount ?? existing.discount,
      discountType: req.body.discountType || existing.discountType,
      gstRate: req.body.gstRate ?? existing.gstRate,
    });
    const amountPaid = Number(req.body.amountPaid ?? existing.amountPaid) || 0;

    const bill = await prisma.radiologyBill.update({
      where: { id },
      data: {
        items,
        referredBy: req.body.referredBy !== undefined ? req.body.referredBy : existing.referredBy,
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountType: req.body.discountType || existing.discountType,
        gstRate: req.body.gstRate ?? existing.gstRate,
        cgst: totals.cgst,
        sgst: totals.sgst,
        tax: totals.tax,
        grandTotal: totals.grandTotal,
        amountPaid,
        amountDue: Math.round((totals.grandTotal - amountPaid) * 100) / 100,
        status: buildBillStatus(totals.grandTotal, amountPaid),
        notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
      },
    });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const bill = await prisma.radiologyBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ message: 'Radiology bill not found' });

    const { mode, amount, reference } = req.body;
    const payments = Array.isArray(bill.payments) ? bill.payments : [];
    payments.push({ mode, amount: Number(amount) || 0, reference: reference || '', date: new Date().toISOString() });
    const amountPaid = Math.round((Number(bill.amountPaid) + (Number(amount) || 0)) * 100) / 100;
    const amountDue = Math.round((Number(bill.grandTotal) - amountPaid) * 100) / 100;

    const updated = await prisma.radiologyBill.update({
      where: { id },
      data: { payments, amountPaid, amountDue, status: amountDue <= 0 ? 'Paid' : 'Partial', paymentMode: mode },
    });
    await prisma.payment.create({
      data: {
        receiptId: await nextId('PAY', 5),
        patientId: bill.patientId,
        billType: 'Radiology',
        billId: bill.id,
        amount: Number(amount) || 0,
        mode,
        reference,
      },
    }).catch(() => {});
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.radiologyBill.delete({ where: { id } });
    res.json({ message: 'Radiology bill deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Radiology Reports ----------
exports.getReports = async (req, res) => {
  try {
    const { bill, patient, status } = req.query;
    const where = {};
    if (bill) where.billId = toInt(bill);
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    const reports = await prisma.radiologyReport.findMany({
      where,
      include: {
        patient: { select: patientBrief },
        bill: { select: { billId: true, referredBy: true } },
      },
      orderBy: { reportDate: 'desc' },
    });
    res.json(toApi(reports));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await prisma.radiologyReport.findUnique({
      where: { id: toInt(req.params.id) },
      include: { patient: { select: { ...patientBrief, address: true, bloodGroup: true } }, bill: true },
    });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(toApi(report));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createReport = async (req, res) => {
  try {
    const { billId, testName, findings, impression, images, radiologist, status, notes } = req.body;
    const bill = await prisma.radiologyBill.findUnique({ where: { id: toInt(billId) } });
    if (!bill) return res.status(404).json({ message: 'Radiology bill not found' });

    const report = await prisma.radiologyReport.create({
      data: {
        reportId: await nextId('RADR', 5),
        billId: bill.id,
        patientId: bill.patientId,
        testName,
        findings,
        impression,
        images: images || [],
        radiologist,
        status: status || 'Completed',
        notes,
      },
    });
    res.status(201).json(toApi(report));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { testName, findings, impression, images, radiologist, status, notes } = req.body;
    const report = await prisma.radiologyReport.update({ where: { id }, data: { testName, findings, impression, images, radiologist, status, notes } });
    res.json(toApi(report));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.radiologyReport.delete({ where: { id } });
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
