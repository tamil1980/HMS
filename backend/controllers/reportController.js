const prisma = require('../db/prisma');

const toInt = (v) => parseInt(v, 10) || 0;

// Builds a revenue summary across all bill types for a given date range.
const billSummary = async (start, end) => {
  // dateRange applied per-bill by callers; here we handle each model.
  const modelConfigs = [
    { model: prisma.invoice, dateField: 'invoiceDate', name: 'OP' },
    { model: prisma.iPBill, dateField: 'billDate', name: 'IP' },
    { model: prisma.labBill, dateField: 'billDate', name: 'Lab' },
    { model: prisma.pharmacyBill, dateField: 'billDate', name: 'Pharmacy' },
    { model: prisma.radiologyBill, dateField: 'billDate', name: 'Radiology' },
  ];

  const summary = { totalBills: 0, totalCollected: 0, totalBilled: 0, byType: [] };
  for (const cfg of modelConfigs) {
    const range = {};
    if (start) range.gte = start;
    if (end) range.lt = end;
    const whereClause = { status: { not: 'Cancelled' }, [cfg.dateField]: range };
    const [bills, collected, billed] = await Promise.all([
      cfg.model.count({ where: whereClause }),
      cfg.model.aggregate({ where: whereClause, _sum: { amountPaid: true } }),
      cfg.model.aggregate({ where: whereClause, _sum: { grandTotal: true } }),
    ]);
    const collectedAmt = Number(collected._sum.amountPaid) || 0;
    const billedAmt = Number(billed._sum.grandTotal) || 0;
    let netBilled = billedAmt;
    // Sales returns reduce pharmacy sales and are reported separately.
    if (cfg.name === 'Pharmacy') {
      const retWhere = { returnDate: range };
      const retAgg = await prisma.pharmacyReturn.aggregate({ where: retWhere, _sum: { totalAmount: true } });
      netBilled = Math.round((billedAmt - (Number(retAgg._sum.totalAmount) || 0)) * 100) / 100;
    }
    summary.totalBills += bills;
    summary.totalCollected += collectedAmt;
    summary.totalBilled += netBilled;
    summary.byType.push({ _id: cfg.name, bills, collected: collectedAmt, billed: netBilled });
  }

  const paymentWhere = start ? { paidAt: { gte: start, lt: end || new Date() } } : {};
  const paymentModes = await prisma.payment.groupBy({
    by: ['mode'],
    where: paymentWhere,
    _sum: { amount: true },
    _count: { _all: true },
  });
  summary.byMode = paymentModes.map((g) => ({ _id: g.mode, amount: g._sum.amount || 0, count: g._count._all }));

  const [appointments, patients, admissions] = await Promise.all([
    prisma.appointment.count({ where: { appointmentDate: start ? { gte: start, lt: end || new Date() } : {} } }),
    prisma.patient.count({ where: { createdAt: start ? { gte: start, lt: end || new Date() } : {} } }),
    prisma.iPAdmission.count({ where: { admissionDate: start ? { gte: start, lt: end || new Date() } : {} } }),
  ]);
  summary.appointments = appointments;
  summary.newPatients = patients;
  summary.admissions = admissions;
  return summary;
};

exports.daily = async (req, res) => {
  try {
    const date = req.query.date ? new Date(`${req.query.date}T00:00:00.000Z`) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const summary = await billSummary(start, end);

    const todayAppointments = await prisma.appointment.groupBy({
      by: ['status'],
      where: { appointmentDate: { gte: start, lt: end } },
      _count: { _all: true },
    });

    res.json({ date: req.query.date || start.toISOString(), ...summary,
      appointmentStatus: todayAppointments.map((g) => ({ _id: g.status, count: g._count._all })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.monthly = async (req, res) => {
  try {
    const year = toInt(req.query.year) || new Date().getFullYear();
    const month = toInt(req.query.month) || new Date().getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const summary = await billSummary(start, end);

    // Daily collection trend for the month
    const payments = await prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      select: { paidAt: true, amount: true },
    });
    const dailyMap = {};
    for (const p of payments) {
      const day = p.paidAt.getDate();
      dailyMap[day] = (dailyMap[day] || 0) + (Number(p.amount) || 0);
    }
    const daily = Object.entries(dailyMap).map(([day, total]) => ({ _id: day, total })).sort((a, b) => a._id - b._id);

    res.json({ year, month, ...summary, daily });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.yearly = async (req, res) => {
  try {
    const year = toInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const summary = await billSummary(start, end);

    // Monthly collection trend for the year
    const payments = await prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      select: { paidAt: true, amount: true },
    });
    const monthlyMap = {};
    for (const p of payments) {
      const m = p.paidAt.getMonth() + 1;
      monthlyMap[m] = (monthlyMap[m] || 0) + (Number(p.amount) || 0);
    }
    const monthly = Object.entries(monthlyMap).map(([m, total]) => ({ _id: m, total })).sort((a, b) => a._id - b._id);

    res.json({ year, ...summary, monthly });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
