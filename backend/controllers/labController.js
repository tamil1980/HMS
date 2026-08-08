const prisma = require('../db/prisma');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');
const { computeBillTotals, buildBillStatus, dateRange } = require('../utils/billing');

const toInt = (v) => parseInt(v, 10);

const labTestFields = [
  'name',
  'category',
  'department',
  'price',
  'gstRate',
  'sampleType',
  'unit',
  'referenceRange',
  'defaultResult',
  'turnaroundTime',
  'isActive',
];

const pickLabTest = (body) => {
  const data = {};
  for (const field of labTestFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
};

const buildPayment = (body, amount) => {
  const mode = body.paymentMode;
  if (!mode || Number(amount) <= 0) return null;
  const payment = { mode, amount: Number(amount) };
  if (mode === 'UPI') payment.transactionId = body.transactionId;
  if (mode === 'Debit Card' || mode === 'Credit Card') {
    payment.cardNumber = body.cardNumber;
    payment.cardHolder = body.cardHolder;
    payment.cardExpiry = body.cardExpiry;
  }
  payment.reference = body.reference || undefined;
  return payment;
};

const patientBrief = { id: true, name: true, phone: true, patientId: true, age: true, gender: true };

// ---- Tests ----

exports.getTests = async (req, res) => {
  try {
    const { category, active, q, format } = req.query;
    const where = {};
    if (category) where.category = category;
    if (active === 'true' || active === true) where.isActive = true;
    if (q) where.name = { contains: q };
    const tests = await prisma.labTest.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });

    if (format === 'excel') {
      const { generateLabTestsExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generateLabTestsExcel(tests, hospital || {});
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=LabTests.xlsx');
      return res.send(buffer);
    }

    res.json(toApi(tests));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const test = await prisma.labTest.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!test) return res.status(404).json({ message: 'Lab test not found' });
    res.json(toApi(test));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTest = async (req, res) => {
  try {
    const data = pickLabTest(req.body);
    data.testId = await nextId('LT', 4);
    const test = await prisma.labTest.create({ data });
    res.status(201).json(toApi(test));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await prisma.labTest.update({
      where: { id: parseInt(req.params.id, 10) },
      data: pickLabTest(req.body),
    });
    if (!test) return res.status(404).json({ message: 'Lab test not found' });
    res.json(toApi(test));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeTest = async (req, res) => {
  try {
    const test = await prisma.labTest.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!test) return res.status(404).json({ message: 'Lab test not found' });
    res.json({ message: 'Lab test deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bulkImportTests = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Upload an Excel file' });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ message: 'No sheet found' });

    const headerMap = {};
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
    });

    const col = (row, names) => {
      for (const n of names) {
        const idx = headerMap[n];
        if (idx) return row.getCell(idx).value;
      }
      return undefined;
    };

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = col(row, ['test name', 'name']);
      if (!name) return;
      const priceRaw = col(row, ['amount', 'price', 'price (rs)', 'price (inr)']);
      rows.push({
        name: String(name).trim(),
        category: col(row, ['category']) ? String(col(row, ['category'])).trim() : 'Test',
        department: col(row, ['department']) ? String(col(row, ['department'])).trim() : '',
        price: priceRaw ? Number(priceRaw) : 0,
        gstRate: col(row, ['gst rate', 'gst rate %', 'gst %', 'gst']) ? Number(col(row, ['gst rate', 'gst rate %', 'gst %', 'gst'])) : 0,
        sampleType: col(row, ['sample type', 'sample']) ? String(col(row, ['sample type', 'sample'])).trim() : '',
        unit: col(row, ['unit']) ? String(col(row, ['unit'])).trim() : '',
        referenceRange: col(row, ['reference range', 'reference', 'normal range', 'normal values']) ? String(col(row, ['reference range', 'reference', 'normal range', 'normal values'])).trim() : '',
        defaultResult: col(row, ['default result', 'result']) ? String(col(row, ['default result', 'result'])).trim() : '',
        turnaroundTime: col(row, ['turnaround time', 'tat', 'turnaround']) ? String(col(row, ['turnaround time', 'tat', 'turnaround'])).trim() : '',
      });
    });

    let imported = 0;
    let updated = 0;
    for (const row of rows) {
      const existing = await prisma.labTest.findFirst({ where: { name: row.name } });
      if (existing) {
        await prisma.labTest.update({ where: { id: existing.id }, data: row });
        updated++;
      } else {
        await prisma.labTest.create({ data: { ...row, testId: await nextId('LT', 4) } });
        imported++;
      }
    }

    res.json({ message: `${imported} imported, ${updated} updated`, imported, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- Bills ----

exports.getBills = async (req, res) => {
  try {
    const { patient, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    if (fromDate || toDate) where.billDate = dateRange(fromDate, toDate);

    const bills = await prisma.labBill.findMany({
      where,
      include: { patient: { select: patientBrief } },
      orderBy: { billDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.labBill.count({ where });
    res.json({ bills: toApi(bills), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await prisma.labBill.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true } },
        appointment: { select: { id: true, appointmentId: true, appointmentDate: true } },
      },
    });
    if (!bill) return res.status(404).json({ message: 'Lab bill not found' });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const billBase = (body) => {
  const data = {};
  const fields = ['billDate', 'referredBy', 'items', 'discount', 'discountType', 'gstRate', 'notes'];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.billDate === '' || data.billDate === null || data.billDate === undefined) delete data.billDate;
  else if (!(data.billDate instanceof Date)) data.billDate = new Date(data.billDate);
  return data;
};

exports.createBill = async (req, res) => {
  try {
    const { items, discount, discountType, gstRate } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Add at least one item' });
    const totals = computeBillTotals({ items, discount, discountType, gstRate });
    const amountPaid = Number(req.body.amountPaid) || 0;
    const payment = buildPayment(req.body, amountPaid);

    const data = billBase(req.body);
    data.patientId = toInt(req.body.patient);
    data.appointmentId = req.body.appointment ? toInt(req.body.appointment) : null;
    data.items = items;
    data.subtotal = totals.subtotal;
    data.discount = totals.discount;
    data.discountType = discountType || 'fixed';
    data.gstRate = totals.tax > 0 ? (Number(gstRate) || 0) : (Number(gstRate) || 0);
    data.cgst = totals.cgst;
    data.sgst = totals.sgst;
    data.tax = totals.tax;
    data.grandTotal = totals.grandTotal;
    data.amountPaid = amountPaid;
    data.amountDue = Math.round((totals.grandTotal - amountPaid) * 100) / 100;
    data.status = buildBillStatus(totals.grandTotal, amountPaid);
    data.paymentMode = payment ? payment.mode : null;
    data.payments = payment ? [payment] : [];
    data.billId = await nextId('LB', 5);

    const bill = await prisma.labBill.create({ data });
    const populated = await prisma.labBill.findUnique({
      where: { id: bill.id },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.labBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Lab bill not found' });

    const items = req.body.items || existing.items;
    const totals = computeBillTotals({
      items,
      discount: req.body.discount ?? existing.discount,
      discountType: req.body.discountType || existing.discountType,
      gstRate: req.body.gstRate ?? existing.gstRate,
    });
    const amountPaid = Number(req.body.amountPaid ?? existing.amountPaid) || 0;
    const payment = buildPayment(req.body, amountPaid);

    const data = billBase(req.body);
    if (req.body.patient !== undefined) data.patientId = toInt(req.body.patient);
    if (req.body.appointment !== undefined) data.appointmentId = req.body.appointment ? toInt(req.body.appointment) : null;
    data.items = items;
    data.subtotal = totals.subtotal;
    data.discount = totals.discount;
    data.discountType = req.body.discountType || existing.discountType;
    data.cgst = totals.cgst;
    data.sgst = totals.sgst;
    data.tax = totals.tax;
    data.grandTotal = totals.grandTotal;
    data.amountPaid = amountPaid;
    data.amountDue = Math.round((totals.grandTotal - amountPaid) * 100) / 100;
    data.status = buildBillStatus(totals.grandTotal, amountPaid);
    data.paymentMode = payment ? payment.mode : null;
    data.payments = payment ? [payment] : [];

    const bill = await prisma.labBill.update({
      where: { id },
      data,
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });
    if (!bill) return res.status(404).json({ message: 'Lab bill not found' });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeBill = async (req, res) => {
  try {
    const bill = await prisma.labBill.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!bill) return res.status(404).json({ message: 'Lab bill not found' });
    res.json({ message: 'Lab bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bill = await prisma.labBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ message: 'Lab bill not found' });

    const { mode, amount, reference, transactionId, cardNumber, cardHolder, cardExpiry } = req.body;
    const payment = { mode, amount: Number(amount), reference };
    if (mode === 'UPI') payment.transactionId = transactionId;
    if (mode === 'Debit Card' || mode === 'Credit Card') {
      payment.cardNumber = cardNumber;
      payment.cardHolder = cardHolder;
      payment.cardExpiry = cardExpiry;
    }

    const payments = Array.isArray(bill.payments) ? bill.payments : [];
    payments.push({ ...payment, date: new Date().toISOString() });
    const amountPaid = Math.round((Number(bill.amountPaid) + (Number(amount) || 0)) * 100) / 100;
    const amountDue = Math.round((Number(bill.grandTotal) - amountPaid) * 100) / 100;
    const status = amountDue <= 0 ? 'Paid' : 'Partial';

    const updated = await prisma.labBill.update({
      where: { id },
      data: { payments, amountPaid, paymentMode: mode, amountDue, status },
    });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const bill = await prisma.labBill.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true },
    });
    if (!bill) return res.status(404).json({ message: 'Lab bill not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generateLabBillPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=LabBill_${bill.billId}.pdf`);
    await generateLabBillPDF(bill, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- Results ----

exports.getResults = async (req, res) => {
  try {
    const { patient, bill, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (bill) where.billId = toInt(bill);
    if (status) where.status = status;
    if (fromDate || toDate) where.resultDate = dateRange(fromDate, toDate);

    const results = await prisma.labResult.findMany({
      where,
      include: {
        patient: { select: patientBrief },
        bill: { select: { id: true, billId: true } },
      },
      orderBy: { resultDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.labResult.count({ where });
    res.json({ results: toApi(results), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const result = await prisma.labResult.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true } },
        bill: { select: { id: true, billId: true, billDate: true } },
      },
    });
    if (!result) return res.status(404).json({ message: 'Lab result not found' });
    res.json(toApi(result));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resultFields = ['referredBy', 'sampleCollectedAt', 'resultDate', 'tests', 'status', 'notes'];

const pickResult = (body) => {
  const data = {};
  for (const field of resultFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  for (const field of ['sampleCollectedAt', 'resultDate']) {
    if (data[field] === '' || data[field] === null || data[field] === undefined) delete data[field];
    else if (!(data[field] instanceof Date)) data[field] = new Date(data[field]);
  }
  return data;
};

exports.createResult = async (req, res) => {
  try {
    const data = pickResult(req.body);
    data.patientId = toInt(req.body.patient);
    data.billId = req.body.bill ? toInt(req.body.bill) : null;
    data.resultId = await nextId('LR', 5);

    const result = await prisma.labResult.create({ data });
    const populated = await prisma.labResult.findUnique({
      where: { id: result.id },
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        bill: { select: { id: true, billId: true } },
      },
    });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateResult = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = pickResult(req.body);
    if (req.body.patient !== undefined) data.patientId = toInt(req.body.patient);
    if (req.body.bill !== undefined) data.billId = req.body.bill ? toInt(req.body.bill) : null;

    const result = await prisma.labResult.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        bill: { select: { id: true, billId: true } },
      },
    });
    if (!result) return res.status(404).json({ message: 'Lab result not found' });
    res.json(toApi(result));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeResult = async (req, res) => {
  try {
    const result = await prisma.labResult.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!result) return res.status(404).json({ message: 'Lab result not found' });
    res.json({ message: 'Lab result deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadResultPDF = async (req, res) => {
  try {
    const result = await prisma.labResult.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true, bill: { select: { id: true, billId: true } } },
    });
    if (!result) return res.status(404).json({ message: 'Lab result not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generateLabResultPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=LabResult_${result.resultId}.pdf`);
    await generateLabResultPDF(result, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.collectionReport = async (req, res) => {
  try {
    const { fromDate, toDate, format } = req.query;
    const where = { status: { not: 'Cancelled' } };
    if (fromDate || toDate) where.billDate = dateRange(fromDate, toDate);
    const bills = await prisma.labBill.findMany({
      where,
      include: { patient: { select: { id: true, name: true, phone: true } } },
      orderBy: { billDate: 'desc' },
    });

    if (format === 'excel') {
      const { generateLabCollectionReportExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generateLabCollectionReportExcel(bills, hospital || {}, fromDate || 'All', toDate || 'All');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=LabCollectionReport_${fromDate || 'All'}_to_${toDate || 'All'}.xlsx`);
      return res.send(buffer);
    }
    if (format === 'pdf') {
      const { generateCollectionReportPDF } = require('../utils/pdfGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=LabCollectionReport_${fromDate || 'All'}_to_${toDate || 'All'}.pdf`);
      return await generateCollectionReportPDF(bills, hospital || {}, fromDate || 'All', toDate || 'All', res, 'LAB COLLECTION REPORT', { idKey: 'billId', dateKey: 'billDate' });
    }
    const totalAmount = bills.reduce((s, b) => s + Number(b.grandTotal), 0);
    const totalPaid = bills.reduce((s, b) => s + Number(b.amountPaid), 0);
    const totalDue = bills.reduce((s, b) => s + Number(b.amountDue), 0);
    const totalTax = bills.reduce((s, b) => s + Number(b.tax), 0);
    res.json({ bills: toApi(bills), summary: { totalBills: bills.length, totalAmount, totalPaid, totalDue, totalTax } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
