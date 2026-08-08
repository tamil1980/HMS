const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');

const aggregatePaid = async (model, where) => {
  const result = await model.aggregate({ where, _sum: { amountPaid: true } });
  return Number(result._sum.amountPaid) || 0;
};
const aggregateTotal = async (model, where) => {
  const result = await model.aggregate({ where, _sum: { grandTotal: true } });
  return Number(result._sum.grandTotal) || 0;
};
const aggregateReturns = async (where) => {
  const result = await prisma.pharmacyReturn.aggregate({ where, _sum: { totalAmount: true } });
  return Number(result._sum.totalAmount) || 0;
};

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const activeWhere = { status: { not: 'Cancelled' } };

    const [
      totalPatients,
      totalDoctors,
      totalNurses,
      totalEmployees,
      todayAppointments,
      todayCompleted,
      activeAdmissions,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.consultant.count({ where: { isActive: true } }),
      prisma.nurse.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { isActive: true } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: tomorrow }, status: { not: 'Cancelled' } } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: tomorrow }, status: 'Completed' } }),
      prisma.iPAdmission.count({ where: { status: 'Admitted' } }),
    ]);

    const [
      monthlyRevenue,
      todayRevenue,
      labBillsToday,
      labRevenueToday,
      pharmacyBillsToday,
      pharmacyRevenueToday,
      radiologyBillsToday,
      radiologyRevenueToday,
      labRevenueMonth,
      pharmacyRevenueMonth,
      radiologyRevenueMonth,
      ipRevenueMonth,
      pharmacyReturnsToday,
      pharmacyReturnsMonth,
      todayOP,
      todayLab,
      todayPharmacy,
      todayRadiology,
      todayIP,
    ] = await Promise.all([
      aggregatePaid(prisma.invoice, { invoiceDate: { gte: monthStart }, ...activeWhere }),
      aggregatePaid(prisma.invoice, { invoiceDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      prisma.labBill.count({ where: { billDate: { gte: today, lt: tomorrow }, ...activeWhere } }),
      aggregatePaid(prisma.labBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      prisma.pharmacyBill.count({ where: { billDate: { gte: today, lt: tomorrow }, ...activeWhere } }),
      aggregatePaid(prisma.pharmacyBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      aggregatePaid(prisma.radiologyBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      aggregatePaid(prisma.labBill, { billDate: { gte: monthStart }, ...activeWhere }),
      aggregatePaid(prisma.pharmacyBill, { billDate: { gte: monthStart }, ...activeWhere }),
      aggregatePaid(prisma.radiologyBill, { billDate: { gte: monthStart }, ...activeWhere }),
      aggregatePaid(prisma.iPBill, { billDate: { gte: monthStart }, ...activeWhere }),
      aggregateReturns({ returnDate: { gte: today, lt: tomorrow } }),
      aggregateReturns({ returnDate: { gte: monthStart } }),
      aggregateTotal(prisma.invoice, { invoiceDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      aggregateTotal(prisma.labBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      aggregateTotal(prisma.pharmacyBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      aggregateTotal(prisma.radiologyBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
      aggregateTotal(prisma.iPBill, { billDate: { gte: today, lt: tomorrow }, ...activeWhere }),
    ]);

    const statusGroups = await prisma.appointment.groupBy({
      by: ['status'],
      where: { appointmentDate: { gte: today, lt: tomorrow } },
      _count: { _all: true },
    });
    const statusCounts = statusGroups.map((g) => ({ _id: g.status, count: g._count._all }));

    const [recentAppointments, bedOverview, claims] = await Promise.all([
      prisma.appointment.findMany({
        where: { appointmentDate: { gte: today } },
        include: {
          patient: { select: { id: true, name: true, phone: true, patientId: true } },
          consultant: { select: { id: true, name: true } },
        },
        orderBy: { appointmentDate: 'asc' },
        take: 10,
      }),
      (async () => {
        const [totalBeds, occupiedBeds] = await Promise.all([
          prisma.bed.count({ where: { isActive: true } }),
          prisma.bed.count({ where: { status: 'Occupied' } }),
        ]);
        return { totalBeds, occupiedBeds, availableBeds: totalBeds - occupiedBeds };
      })(),
      prisma.insuranceClaim.count({ where: { status: { in: ['Submitted', 'Approved'] } } }),
    ]);

    // Monthly collection trend (all bill types via unified payments table)
    const yearPayments = await prisma.payment.findMany({
      where: { paidAt: { gte: yearStart } },
      select: { paidAt: true, amount: true },
    });
    const monthlyMap = {};
    for (const p of yearPayments) {
      const month = p.paidAt.getMonth() + 1;
      if (!monthlyMap[month]) monthlyMap[month] = { _id: month, total: 0, count: 0 };
      monthlyMap[month].total += Number(p.amount) || 0;
      monthlyMap[month].count += 1;
    }
    const monthlyData = Object.values(monthlyMap).sort((a, b) => a._id - b._id);

    res.json({
      totalPatients,
      totalDoctors,
      totalNurses,
      totalEmployees,
      todayAppointments,
      todayCompleted,
      activeAdmissions,
      monthlyRevenue,
      todayRevenue,
      labBillsToday,
      labRevenueToday,
      pharmacyBillsToday,
      pharmacyRevenueToday: pharmacyRevenueToday - pharmacyReturnsToday,
      pharmacyReturnsToday,
      radiologyBillsToday,
      radiologyRevenueToday,
      labRevenueMonth,
      pharmacyRevenueMonth: pharmacyRevenueMonth - pharmacyReturnsMonth,
      pharmacyReturnsMonth,
      radiologyRevenueMonth,
      ipRevenueMonth,
      todayOP,
      todayLab,
      todayPharmacy: todayPharmacy - pharmacyReturnsToday,
      todayRadiology,
      todayIP,
      statusCounts,
      recentAppointments: toApi(recentAppointments),
      monthlyData,
      bedOverview,
      pendingClaims: claims,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
