const prisma = require('../db/prisma');
const { nextId } = require('../utils/sequences');
const { toApi } = require('../utils/serialize');
const { computeBillTotals, buildBillStatus, dateRange } = require('../utils/billing');

const toInt = (v) => parseInt(v, 10);

const medIdOf = (it) => {
  const m = it && it.medicine;
  if (m === null || m === undefined || m === '') return NaN;
  if (typeof m === 'object') return toInt(m.id ?? m._id);
  return toInt(m);
};

const restock = async (items, sign = 1) => {
  for (const it of items || []) {
    const id = medIdOf(it);
    if (Number.isNaN(id)) continue;
    await prisma.medicine.update({
      where: { id },
      data: { quantity: { increment: sign * (Number(it.quantity) || 0) } },
    });
  }
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
const supplierBrief = { id: true, name: true, company: true, phone: true };

// ---- Medicines ----

exports.getMedicines = async (req, res) => {
  try {
    const { active, q, lowStock, format } = req.query;
    const where = {};
    if (active === 'true' || active === true) where.isActive = true;
    if (q) where.name = { contains: q };
    let medicines = await prisma.medicine.findMany({ where, orderBy: { name: 'asc' } });
    if (lowStock === 'true') medicines = medicines.filter((m) => Number(m.quantity) <= Number(m.reorderLevel));

    if (format === 'excel') {
      const { generateMedicinesExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generateMedicinesExcel(medicines, hospital || {});
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Medicines.xlsx');
      return res.send(buffer);
    }

    res.json(toApi(medicines));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const parseExcelSheet = (filePath) => {
  const ExcelJS = require('exceljs');
  return (async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('No sheet found');
    const headerMap = {};
    sheet.getRow(1).eachCell((cell, colNumber) => {
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
      rows.push({ row, col });
    });
    return rows;
  })();
};

const parseDate = (v) => {
  if (!v) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  const s = String(v).trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    const date = new Date(`${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
    return isNaN(date.getTime()) ? undefined : date;
  }
  const ym = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (ym) {
    const date = new Date(`${ym[2]}-${ym[1].padStart(2, '0')}-01`);
    return isNaN(date.getTime()) ? undefined : date;
  }
  const date = new Date(s);
  return isNaN(date.getTime()) ? undefined : date;
};

exports.bulkImportMedicines = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Upload an Excel file' });
    const rows = await parseExcelSheet(req.file.path);
    let imported = 0;
    let updated = 0;
    for (const { row, col } of rows) {
      const name = col(row, ['medicine name', 'name', 'medicine']);
      if (!name) continue;
      const toNum = (v) => (v === undefined || v === null || v === '') ? undefined : Number(String(v).replace(/[^0-9.-]/g, ''));
      const data = {
        code: col(row, ['code', 'medicine id', 'medicine code']) ? String(col(row, ['code', 'medicine id', 'medicine code'])).trim() : undefined,
        name: String(name).trim(),
        genericName: col(row, ['generic name', 'generic']) ? String(col(row, ['generic name', 'generic'])).trim() : undefined,
        category: col(row, ['category']) ? String(col(row, ['category'])).trim() : undefined,
        unit: col(row, ['unit']) ? String(col(row, ['unit'])).trim() : 'Strip',
        purchasePrice: toNum(col(row, ['purchase price', 'pp', 'cost price', 'purchase rate', 'price'])),
        salePrice: toNum(col(row, ['sale price', 'sp', 'selling price', 'sale rate'])),
        gstRate: toNum(col(row, ['gst rate', 'gst rate %', 'gst %', 'gst'])),
        quantity: toNum(col(row, ['quantity', 'qty', 'stock', 'opening quantity'])),
        reorderLevel: toNum(col(row, ['reorder level', 'reorder', 'reorder point'])),
        expiryDate: parseDate(col(row, ['expiry date', 'expiry'])),
      };
      Object.keys(data).forEach((k) => { if (data[k] === undefined) delete data[k]; });
      const existing = data.code ? await prisma.medicine.findFirst({ where: { code: data.code } }) : null;
      const byName = existing ? null : await prisma.medicine.findFirst({ where: { name: data.name } });
      const match = existing || byName;
      if (match) {
        await prisma.medicine.update({ where: { id: match.id }, data });
        updated++;
      } else {
        await prisma.medicine.create({ data: { ...data, medicineId: await nextId('MED', 4) } });
        imported++;
      }
    }
    res.json({ message: `${imported} imported, ${updated} updated`, imported, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bulkImportGRN = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Upload an Excel file' });
    const rows = await parseExcelSheet(req.file.path);
    const items = [];
    const skipped = [];
    for (const { row, col } of rows) {
      const name = col(row, ['medicine name', 'medicine', 'name']);
      if (!name) continue;
      const toNum = (v) => (v === undefined || v === null || v === '') ? undefined : Number(String(v).replace(/[^0-9.-]/g, ''));
      const medName = String(name).trim();
      const med = await prisma.medicine.findFirst({
        where: { name: medName },
      });
      const codeVal = col(row, ['code', 'medicine id']);
      const medByCode = !med && codeVal ? await prisma.medicine.findFirst({ where: { code: String(codeVal).trim() } }) : null;
      const found = med || medByCode;
      if (!found) { skipped.push(medName); continue; }
      const quantity = toNum(col(row, ['quantity', 'qty'])) || 0;
      const purchasePrice = toNum(col(row, ['purchase rate', 'purchase price', 'p. rate', 'rate', 'price'])) ?? found.purchasePrice ?? 0;
      const gstRate = toNum(col(row, ['gst rate', 'gst rate %', 'gst %', 'gst'])) ?? found.gstRate ?? 0;
      if (quantity <= 0) { skipped.push(`${medName} (invalid qty)`); continue; }
      items.push({
        medicine: found.id,
        name: found.name,
        quantity,
        purchasePrice,
        gstRate,
        amount: Math.round(quantity * purchasePrice * 100) / 100,
      });
    }
    if (!items.length) return res.status(400).json({ message: 'No valid items found. Check medicine names in the sheet.', skipped });
    res.json({ items, skipped, totalAmount: items.reduce((s, it) => s + it.amount, 0) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadGRNTemplate = async (req, res) => {
  try {
    const { generateGRNTemplateExcel } = require('../utils/excelGenerator');
    const buffer = await generateGRNTemplateExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=GRNTemplate.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const medicineFields = [
  'code',
  'name',
  'genericName',
  'category',
  'unit',
  'purchasePrice',
  'salePrice',
  'gstRate',
  'quantity',
  'reorderLevel',
  'expiryDate',
  'isActive',
];

const pickMedicine = (body) => {
  const data = {};
  for (const field of medicineFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.expiryDate === '' || data.expiryDate === null || data.expiryDate === undefined) delete data.expiryDate;
  else if (!(data.expiryDate instanceof Date)) data.expiryDate = new Date(data.expiryDate);
  return data;
};

exports.getMedicineById = async (req, res) => {
  try {
    const medicine = await prisma.medicine.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(toApi(medicine));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    const data = pickMedicine(req.body);
    data.medicineId = await nextId('MED', 4);
    const medicine = await prisma.medicine.create({ data });
    res.status(201).json(toApi(medicine));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await prisma.medicine.update({
      where: { id: parseInt(req.params.id, 10) },
      data: pickMedicine(req.body),
    });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(toApi(medicine));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeMedicine = async (req, res) => {
  try {
    const medicine = await prisma.medicine.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ message: 'Medicine deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) return res.status(400).json({ message: 'quantity is required' });
    const medicine = await prisma.medicine.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { quantity: { increment: Number(quantity) || 0 } },
    });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(toApi(medicine));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- Suppliers ----

const supplierFields = ['company', 'name', 'phone', 'email', 'address', 'gstNumber', 'isActive'];

const pickSupplier = (body) => {
  const data = {};
  for (const field of supplierFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
};

exports.getSuppliers = async (req, res) => {
  try {
    const { q } = req.query;
    const where = {};
    if (q) where.name = { contains: q };
    const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
    res.json(toApi(suppliers));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const data = pickSupplier(req.body);
    data.supplierId = await nextId('SUP', 4);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(toApi(supplier));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: parseInt(req.params.id, 10) },
      data: pickSupplier(req.body),
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(toApi(supplier));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- GRNs ----

exports.getGRNs = async (req, res) => {
  try {
    const { supplier, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (supplier) where.supplierId = toInt(supplier);
    if (fromDate || toDate) where.grnDate = dateRange(fromDate, toDate);

    const grns = await prisma.gRN.findMany({
      where,
      include: { supplier: { select: supplierBrief } },
      orderBy: { grnDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.gRN.count({ where });
    res.json({ grns: toApi(grns), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getGRNById = async (req, res) => {
  try {
    const grn = await prisma.gRN.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        supplier: { select: { id: true, name: true, company: true, phone: true, address: true, gstNumber: true } },
      },
    });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    res.json(toApi(grn));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createGRN = async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Add at least one item' });
    const total = Number(totalAmount) || items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    const data = { items, totalAmount: total };
    data.supplierId = req.body.supplier ? toInt(req.body.supplier) : null;
    data.grnDate = req.body.grnDate ? new Date(req.body.grnDate) : new Date();
    data.invoiceRef = req.body.invoiceRef;
    data.notes = req.body.notes;
    data.grnId = await nextId('GRN', 5);

    const grn = await prisma.gRN.create({ data });
    await restock(items, 1);
    const populated = await prisma.gRN.findUnique({
      where: { id: grn.id },
      include: { supplier: { select: supplierBrief } },
    });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateGRN = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.gRN.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'GRN not found' });

    await restock(existing.items, -1);
    const items = req.body.items || existing.items;
    const totalAmount = Number(req.body.totalAmount) || items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    const data = { items, totalAmount };
    if (req.body.supplier !== undefined) data.supplierId = req.body.supplier ? toInt(req.body.supplier) : null;
    if (req.body.grnDate !== undefined) data.grnDate = new Date(req.body.grnDate);
    if (req.body.invoiceRef !== undefined) data.invoiceRef = req.body.invoiceRef;
    if (req.body.notes !== undefined) data.notes = req.body.notes;

    const grn = await prisma.gRN.update({
      where: { id },
      data,
      include: { supplier: { select: supplierBrief } },
    });
    await restock(items, 1);
    res.json(toApi(grn));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeGRN = async (req, res) => {
  try {
    const grn = await prisma.gRN.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    await restock(grn.items, -1);
    await prisma.gRN.delete({ where: { id: grn.id } });
    res.json({ message: 'GRN deleted successfully and stock adjusted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadGRNPDF = async (req, res) => {
  try {
    const grn = await prisma.gRN.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { supplier: true },
    });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generateGRNPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=GRN_${grn.grnId}.pdf`);
    await generateGRNPDF(grn, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- Bills ----

exports.getBills = async (req, res) => {
  try {
    const { patient, admission, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (admission) where.admissionId = toInt(admission);
    if (status) where.status = status;
    if (fromDate || toDate) where.billDate = dateRange(fromDate, toDate);

    const bills = await prisma.pharmacyBill.findMany({
      where,
      include: {
        patient: { select: patientBrief },
        doctor: { select: { id: true, name: true, specialization: true } },
        admission: { select: { id: true, admissionId: true, wardName: true, bedNumber: true } },
      },
      orderBy: { billDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.pharmacyBill.count({ where });
    res.json({ bills: toApi(bills), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await prisma.pharmacyBill.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });
    if (!bill) return res.status(404).json({ message: 'Pharmacy bill not found' });
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

const checkStock = async (items) => {
  for (const it of items) {
    const medId = medIdOf(it);
    const med = await prisma.medicine.findUnique({ where: { id: medId } });
    if (!med) return `Medicine not found: ${it.name}`;
    if (Number(it.quantity) > Number(med.quantity)) {
      return `Insufficient stock for ${med.name}. Available: ${med.quantity}`;
    }
  }
  return null;
};

exports.createBill = async (req, res) => {
  try {
    const { items, discount, discountType, gstRate } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Add at least one item' });
    const stockError = await checkStock(items);
    if (stockError) return res.status(400).json({ message: stockError });

    const totals = computeBillTotals({ items, discount, discountType, gstRate });
    const amountPaid = Number(req.body.amountPaid) || 0;
    const payment = buildPayment(req.body, amountPaid);

    const data = billBase(req.body);
    data.patientId = req.body.patient ? toInt(req.body.patient) : null;
    data.doctorId = req.body.doctor ? toInt(req.body.doctor) : null;
    data.admissionId = req.body.admission ? toInt(req.body.admission) : null;
    data.items = items;
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
    data.billId = await nextId('PB', 5);

    const bill = await prisma.pharmacyBill.create({ data });
    await restock(items, -1);
    const populated = await prisma.pharmacyBill.findUnique({
      where: { id: bill.id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.pharmacyBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Pharmacy bill not found' });

    const items = req.body.items || existing.items;
    const stockError = await checkStock(items);
    if (stockError) return res.status(400).json({ message: stockError });

    await restock(existing.items, 1);
    const totals = computeBillTotals({
      items,
      discount: req.body.discount ?? existing.discount,
      discountType: req.body.discountType || existing.discountType,
      gstRate: req.body.gstRate ?? existing.gstRate,
    });
    const amountPaid = Number(req.body.amountPaid ?? existing.amountPaid) || 0;
    const payment = buildPayment(req.body, amountPaid);

    const data = billBase(req.body);
    if (req.body.patient !== undefined) data.patientId = req.body.patient ? toInt(req.body.patient) : null;
    if (req.body.doctor !== undefined) data.doctorId = req.body.doctor ? toInt(req.body.doctor) : null;
    if (req.body.admission !== undefined) data.admissionId = req.body.admission ? toInt(req.body.admission) : null;
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
    data.paymentMode = payment ? payment.mode : null;
    data.payments = payment ? [payment] : [];

    const bill = await prisma.pharmacyBill.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
    await restock(items, -1);
    res.json(toApi(bill));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeBill = async (req, res) => {
  try {
    const bill = await prisma.pharmacyBill.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!bill) return res.status(404).json({ message: 'Pharmacy bill not found' });
    await restock(bill.items, 1);
    await prisma.pharmacyBill.delete({ where: { id: bill.id } });
    res.json({ message: 'Pharmacy bill deleted successfully and stock restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bill = await prisma.pharmacyBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ message: 'Pharmacy bill not found' });

    const { mode, amount, reference } = req.body;
    const payments = Array.isArray(bill.payments) ? bill.payments : [];
    payments.push({ mode, amount: Number(amount) || 0, reference: reference || '', date: new Date().toISOString() });

    const amountPaid = Math.round((Number(bill.amountPaid) + (Number(amount) || 0)) * 100) / 100;
    const amountDue = Math.round((Number(bill.grandTotal) - amountPaid) * 100) / 100;
    const status = amountDue <= 0 ? 'Paid' : 'Partial';

    const updated = await prisma.pharmacyBill.update({
      where: { id },
      data: { payments, amountPaid, amountDue, status },
    });
    res.json(toApi(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const bill = await prisma.pharmacyBill.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    });
    if (!bill) return res.status(404).json({ message: 'Pharmacy bill not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generatePharmacyBillPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=PharmacyBill_${bill.billId}.pdf`);
    await generatePharmacyBillPDF(bill, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.stockReport = async (req, res) => {
  try {
    const { lowStock, format } = req.query;
    let medicines = await prisma.medicine.findMany({ orderBy: { name: 'asc' } });
    if (lowStock === 'true') medicines = medicines.filter((m) => Number(m.quantity) <= Number(m.reorderLevel));
    const report = medicines.map((m) => ({
      medicineId: m.medicineId,
      name: m.name,
      category: m.category,
      purchasePrice: m.purchasePrice,
      salePrice: m.salePrice,
      quantity: m.quantity,
      reorderLevel: m.reorderLevel,
      expiryDate: m.expiryDate,
      stockValue: m.quantity * m.purchasePrice,
      isLow: m.quantity <= m.reorderLevel,
    }));

    if (format === 'excel') {
      const { generateStockReportExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generateStockReportExcel(report, hospital || {});
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=StockReport.xlsx');
      return res.send(buffer);
    }
    if (format === 'pdf') {
      const { generateStockReportPDF } = require('../utils/pdfGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=StockReport.pdf');
      return await generateStockReportPDF(report, hospital || {}, res);
    }
    const totalValue = report.reduce((s, m) => s + m.stockValue, 0);
    const totalQty = report.reduce((s, m) => s + m.quantity, 0);
    const lowCount = report.filter((m) => m.isLow).length;
    res.json({ report, summary: { totalItems: report.length, totalValue, totalQty, lowCount } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.collectionReport = async (req, res) => {
  try {
    const { fromDate, toDate, format } = req.query;
    const where = { status: { not: 'Cancelled' } };
    if (fromDate || toDate) where.billDate = dateRange(fromDate, toDate);
    const bills = await prisma.pharmacyBill.findMany({
      where,
      include: { patient: { select: { id: true, name: true, phone: true } } },
      orderBy: { billDate: 'desc' },
    });

    // Sales returns reduce the net pharmacy sales and are reported separately.
    const retWhere = {};
    if (fromDate || toDate) retWhere.returnDate = dateRange(fromDate, toDate);
    const returns = await prisma.pharmacyReturn.findMany({
      where: retWhere,
      include: { patient: { select: { id: true, name: true, phone: true, patientId: true } } },
      orderBy: { returnDate: 'desc' },
    });

    if (format === 'excel') {
      const { generatePharmacyCollectionReportExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generatePharmacyCollectionReportExcel(bills, hospital || {}, fromDate || 'All', toDate || 'All', returns);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=PharmacyCollectionReport_${fromDate || 'All'}_to_${toDate || 'All'}.xlsx`);
      return res.send(buffer);
    }
    if (format === 'pdf') {
      const { generateCollectionReportPDF } = require('../utils/pdfGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=PharmacyCollectionReport_${fromDate || 'All'}_to_${toDate || 'All'}.pdf`);
      return await generateCollectionReportPDF(bills, hospital || {}, fromDate || 'All', toDate || 'All', res, 'PHARMACY COLLECTION REPORT', { idKey: 'billId', dateKey: 'billDate', returns });
    }
    const totalAmount = bills.reduce((s, b) => s + Number(b.grandTotal), 0);
    const totalPaid = bills.reduce((s, b) => s + Number(b.amountPaid), 0);
    const totalDue = bills.reduce((s, b) => s + Number(b.amountDue), 0);
    const totalTax = bills.reduce((s, b) => s + Number(b.tax), 0);
    const totalReturns = returns.reduce((s, r) => s + Number(r.totalAmount), 0);
    res.json({
      bills: toApi(bills),
      returns: toApi(returns),
      summary: {
        totalBills: bills.length,
        totalAmount,
        totalPaid,
        totalDue,
        totalTax,
        totalReturns,
        netAmount: Math.round((totalAmount - totalReturns) * 100) / 100,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---- Sales Returns ----

// Computes return totals using each item's own GST rate (matches the sold bill).
const computeReturnTotals = (items) => {
  let subtotal = 0, cgst = 0, sgst = 0;
  for (const it of items || []) {
    const amt = Number(it.amount) || 0;
    const rate = Number(it.gstRate) || 0;
    subtotal += amt;
    cgst += amt * (rate / 2) / 100;
    sgst += amt * (rate / 2) / 100;
  }
  const tax = cgst + sgst;
  const totalAmount = Math.round((subtotal + tax) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    totalAmount,
  };
};

const returnInclude = {
  patient: { select: patientBrief },
  bill: { select: { id: true, billId: true } },
};

exports.createReturn = async (req, res) => {
  try {
    const { items, reason, refundMode, refunded, notes, returnDate } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Add at least one item' });

    let billId = req.body.bill ? toInt(req.body.bill) : null;
    let patientId = req.body.patient ? toInt(req.body.patient) : null;

    if (billId) {
      const existingBill = await prisma.pharmacyBill.findUnique({ where: { id: billId } });
      if (!existingBill) return res.status(404).json({ message: 'Pharmacy bill not found' });
      if (!patientId && existingBill.patientId) patientId = existingBill.patientId;

      // Quantities already returned against this bill so we cannot over-return.
      const prevReturns = await prisma.pharmacyReturn.findMany({ where: { billId } });
      const returnedMap = {};
      for (const pr of prevReturns) {
        for (const pit of pr.items || []) {
          const mid = medIdOf(pit);
          if (Number.isNaN(mid)) continue;
          returnedMap[mid] = (returnedMap[mid] || 0) + (Number(pit.quantity) || 0);
        }
      }

      for (const it of items) {
        const sold = (existingBill.items || []).find((s) => medIdOf(s) === medIdOf(it));
        const soldQty = sold ? Number(sold.quantity) || 0 : 0;
        const already = returnedMap[medIdOf(it)] || 0;
        const remaining = Math.max(0, soldQty - already);
        if (Number(it.quantity) > remaining) {
          return res.status(400).json({ message: `Return qty for ${it.name} (${it.quantity}) exceeds remaining returnable qty (${remaining})` });
        }
      }
    }

    const totals = computeReturnTotals(items);
    const data = {
      billId,
      patientId: patientId || null,
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      items,
      reason: reason || 'Other',
      subtotal: totals.subtotal,
      gstRate: 0,
      cgst: totals.cgst,
      sgst: totals.sgst,
      tax: totals.tax,
      totalAmount: totals.totalAmount,
      refundMode: refundMode || null,
      refunded: !!refunded,
      notes,
      createdBy: req.user ? req.user.name : null,
      returnId: await nextId('PBR', 5),
    };

    const ret = await prisma.pharmacyReturn.create({ data });
    await restock(items, 1);
    const populated = await prisma.pharmacyReturn.findUnique({ where: { id: ret.id }, include: returnInclude });
    res.status(201).json(toApi(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const { patient, bill, status, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const where = {};
    if (patient) where.patientId = toInt(patient);
    if (bill) where.billId = toInt(bill);
    if (fromDate || toDate) where.returnDate = dateRange(fromDate, toDate);
    if (status === 'refunded') where.refunded = true;
    else if (status === 'not-refunded') where.refunded = false;

    const returns = await prisma.pharmacyReturn.findMany({
      where,
      include: returnInclude,
      orderBy: { returnDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    const total = await prisma.pharmacyReturn.count({ where });
    res.json({ returns: toApi(returns), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReturnById = async (req, res) => {
  try {
    const ret = await prisma.pharmacyReturn.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        patient: { select: { ...patientBrief, address: true } },
        bill: { select: { id: true, billId: true } },
      },
    });
    if (!ret) return res.status(404).json({ message: 'Pharmacy return not found' });
    res.json(toApi(ret));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadReturnPDF = async (req, res) => {
  try {
    const ret = await prisma.pharmacyReturn.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { patient: true, bill: { select: { id: true, billId: true } } },
    });
    if (!ret) return res.status(404).json({ message: 'Pharmacy return not found' });
    const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
    const { generatePharmacyReturnPDF } = require('../utils/pdfGenerator');
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=PharmacyReturn_${ret.returnId}.pdf`);
    await generatePharmacyReturnPDF(ret, hospital || {}, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeReturn = async (req, res) => {
  try {
    const ret = await prisma.pharmacyReturn.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!ret) return res.status(404).json({ message: 'Pharmacy return not found' });
    await restock(ret.items, -1);
    await prisma.pharmacyReturn.delete({ where: { id: ret.id } });
    res.json({ message: 'Pharmacy return deleted successfully and stock adjusted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.returnsReport = async (req, res) => {
  try {
    const { fromDate, toDate, format } = req.query;
    const where = {};
    if (fromDate || toDate) where.returnDate = dateRange(fromDate, toDate);
    const returns = await prisma.pharmacyReturn.findMany({
      where,
      include: { patient: { select: { ...patientBrief } } },
      orderBy: { returnDate: 'desc' },
    });

    if (format === 'excel') {
      const { generatePharmacyReturnsReportExcel } = require('../utils/excelGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      const buffer = await generatePharmacyReturnsReportExcel(returns, hospital || {}, fromDate || 'All', toDate || 'All');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=PharmacyReturnsReport_${fromDate || 'All'}_to_${toDate || 'All'}.xlsx`);
      return res.send(buffer);
    }
    if (format === 'pdf') {
      const { generateReturnsReportPDF } = require('../utils/pdfGenerator');
      const hospital = await prisma.hospitalSetting.findFirst().catch(() => null);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=PharmacyReturnsReport_${fromDate || 'All'}_to_${toDate || 'All'}.pdf`);
      return await generateReturnsReportPDF(returns, hospital || {}, fromDate || 'All', toDate || 'All', res);
    }

    const totalQty = returns.reduce((s, r) => s + (r.items || []).reduce((a, it) => a + (Number(it.quantity) || 0), 0), 0);
    const totalAmount = returns.reduce((s, r) => s + Number(r.totalAmount), 0);
    const totalTax = returns.reduce((s, r) => s + Number(r.tax), 0);
    const byReason = {};
    for (const r of returns) {
      const k = r.reason || 'Other';
      byReason[k] = byReason[k] || { count: 0, amount: 0, qty: 0 };
      byReason[k].count++;
      byReason[k].amount += Number(r.totalAmount) || 0;
      byReason[k].qty += (r.items || []).reduce((a, it) => a + (Number(it.quantity) || 0), 0);
    }

    res.json({
      returns: toApi(returns),
      summary: { totalReturns: returns.length, totalAmount, totalTax, totalQty },
      byReason: Object.entries(byReason).map(([reason, v]) => ({ reason, ...v })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
