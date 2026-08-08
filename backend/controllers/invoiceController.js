const prisma = require('../db/prisma');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');
const { dateRange } = require('../utils/billing');

const invoiceFields = [
  'invoiceDate',
  'items',
  'subtotal',
  'discount',
  'discountType',
  'tax',
  'taxRate',
  'grandTotal',
  'amountPaid',
  'status',
  'notes',
];

const toInt = (v) => parseInt(v, 10);

const pickInvoice = (body) => {
  const data = {};
  for (const field of invoiceFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.invoiceDate === '' || data.invoiceDate === null || data.invoiceDate === undefined) delete data.invoiceDate;
  else if (!(data.invoiceDate instanceof Date)) data.invoiceDate = new Date(data.invoiceDate);
  return data;
};

const buildStatus = (amountPaid, grandTotal) =>
  amountPaid >= grandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';

const patientBrief = { id: true, name: true, phone: true };

exports.getAll = async (req, res) => {
  try {
    const { patient, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    if (fromDate || toDate) where.invoiceDate = dateRange(fromDate, toDate);

    const invoices = await prisma.invoice.findMany({
      where,
      include: { patient: { select: { ...patientBrief, patientId: true } } },
      orderBy: { invoiceDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.invoice.count({ where });
    res.json({ invoices: toApi(invoices), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true, age: true, gender: true, address: true } },
        appointment: { select: { id: true, appointmentId: true, appointmentDate: true } },
        caseSheet: { select: { id: true, caseSheetId: true } },
      },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(toApi(invoice));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const grandTotal = Number(req.body.grandTotal) || 0;
    const amountPaid = Number(req.body.amountPaid) || 0;

    const data = pickInvoice(req.body);
    data.patientId = toInt(req.body.patient);
    data.appointmentId = req.body.appointment ? toInt(req.body.appointment) : null;
    data.caseSheetId = req.body.caseSheet ? toInt(req.body.caseSheet) : null;
    data.amountPaid = amountPaid;
    data.amountDue = Math.round((grandTotal - amountPaid) * 100) / 100;
    data.status = buildStatus(amountPaid, grandTotal);
    data.invoiceId = await nextId('INV', 5);

    const invoice = await prisma.invoice.create({ data });
    const populated = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { patient: { select: patientBrief } },
    });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Invoice not found' });

    const data = pickInvoice(req.body);
    if (req.body.patient !== undefined) data.patientId = toInt(req.body.patient);
    if (req.body.appointment !== undefined) data.appointmentId = req.body.appointment ? toInt(req.body.appointment) : null;
    if (req.body.caseSheet !== undefined) data.caseSheetId = req.body.caseSheet ? toInt(req.body.caseSheet) : null;

    const grandTotal = req.body.grandTotal !== undefined ? Number(req.body.grandTotal) : Number(existing.grandTotal);
    const amountPaid = req.body.amountPaid !== undefined ? Number(req.body.amountPaid) : Number(existing.amountPaid);
    data.amountDue = Math.round((grandTotal - amountPaid) * 100) / 100;
    if (req.body.status === undefined) data.status = buildStatus(amountPaid, grandTotal);

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: { patient: { select: patientBrief } },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(toApi(invoice));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const invoice = await prisma.invoice.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=Invoice_${invoice.invoiceId}.pdf`);

    const { generateInvoicePDF } = require('../utils/pdfGenerator');
    await generateInvoicePDF(invoice, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.collectionReport = async (req, res) => {
  try {
    const { fromDate, toDate, format } = req.query;
    const where = { status: { not: 'Cancelled' } };
    if (fromDate || toDate) where.invoiceDate = dateRange(fromDate, toDate);

    const invoices = await prisma.invoice.findMany({
      where,
      include: { patient: { select: patientBrief } },
      orderBy: { invoiceDate: 'desc' },
    });

    if (format === 'excel') {
      const { generateCollectionReportExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generateCollectionReportExcel(invoices, hospital || {}, fromDate || 'All', toDate || 'All', 'Collection Report', 'invoiceId', 'invoiceDate', 'Invoice No');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=CollectionReport_${fromDate || 'All'}_to_${toDate || 'All'}.xlsx`);
      res.send(buffer);
    } else if (format === 'pdf') {
      const { generateCollectionReportPDF } = require('../utils/pdfGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=CollectionReport_${fromDate || 'All'}_to_${toDate || 'All'}.pdf`);
      await generateCollectionReportPDF(invoices, hospital || {}, fromDate || 'All', toDate || 'All', res);
    } else {
      const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
      const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
      res.json({ invoices: toApi(invoices), summary: { totalInvoices: invoices.length, totalAmount, totalPaid, totalDue } });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const { mode, amount, reference } = req.body;
    const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
    payments.push({ mode, amount: Number(amount) || 0, reference: reference || '', date: new Date().toISOString() });

    const amountPaid = Math.round((Number(invoice.amountPaid) + (Number(amount) || 0)) * 100) / 100;
    const amountDue = Math.round((Number(invoice.grandTotal) - amountPaid) * 100) / 100;
    const status = amountDue <= 0 ? 'Paid' : 'Partial';

    const updated = await prisma.invoice.update({
      where: { id },
      data: { payments, amountPaid, amountDue, status },
    });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
