const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');
const { nextId } = require('../utils/sequences');
const { dateRange } = require('../utils/billing');

const toInt = (v) => parseInt(v, 10);

exports.getPayments = async (req, res) => {
  try {
    const { patient, billType, mode, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (billType) where.billType = billType;
    if (mode) where.mode = mode;
    if (fromDate || toDate) where.paidAt = dateRange(fromDate, toDate);

    const payments = await prisma.payment.findMany({
      where,
      include: { patient: { select: { id: true, name: true, phone: true, patientId: true } } },
      orderBy: { paidAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.payment.count({ where });

    const modeGroups = await prisma.payment.groupBy({
      by: ['mode'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const typeGroups = await prisma.payment.groupBy({
      by: ['billType'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    const totalAmount = await prisma.payment.aggregate({ where, _sum: { amount: true } });

    res.json({
      payments: toApi(payments),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      modeSummary: modeGroups.map((g) => ({ _id: g.mode, amount: g._sum.amount, count: g._count._all })),
      typeSummary: typeGroups.map((g) => ({ _id: g.billType, amount: g._sum.amount, count: g._count._all })),
      totalAmount: totalAmount._sum.amount || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Record a payment against any bill type (OP | IP | Lab | Pharmacy | Radiology)
exports.recordPayment = async (req, res) => {
  try {
    const { patientId, billType, billId, amount, mode, reference, paidAt, notes } = req.body;
    if (!patientId || !billId || !amount) return res.status(400).json({ message: 'patientId, billId and amount are required' });

    // Update the corresponding bill's paid amount + status
    const paid = Number(amount) || 0;
    let bill = null;
    const modelMap = { OP: 'invoice', IP: 'iPBill', Lab: 'labBill', Pharmacy: 'pharmacyBill', Radiology: 'radiologyBill' };
    const model = modelMap[billType];
    if (model) {
      bill = await prisma[model].findUnique({ where: { id: toInt(billId) } });
      if (!bill) return res.status(404).json({ message: 'Bill not found' });
      const amountPaid = Math.round((Number(bill.amountPaid) + paid) * 100) / 100;
      const amountDue = Math.round((Number(bill.grandTotal) - amountPaid) * 100) / 100;
      const payments = Array.isArray(bill.payments) ? bill.payments : [];
      payments.push({ mode, amount: paid, reference: reference || '', date: new Date().toISOString() });
      await prisma[model].update({
        where: { id: bill.id },
        data: {
          amountPaid,
          amountDue,
          status: amountDue <= 0 ? 'Paid' : 'Partial',
          paymentMode: mode,
          payments,
        },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        receiptId: await nextId('PAY', 5),
        patientId: toInt(patientId),
        billType,
        billId: toInt(billId),
        amount: paid,
        mode: mode || 'Cash',
        reference,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        receivedBy: req.user ? req.user.name : null,
        notes,
      },
    });
    res.status(201).json(toApi(payment));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.payment.delete({ where: { id } });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
