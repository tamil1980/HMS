const prisma = require('../db/prisma');
const ExcelJS = require('exceljs');
const { toApi } = require('../utils/serialize');

const masterFields = ['type', 'code', 'name', 'description', 'price', 'quantity', 'expiryDate', 'isActive'];

const pickMaster = (body) => {
  const data = {};
  for (const field of masterFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.expiryDate === '' || data.expiryDate === null || data.expiryDate === undefined) delete data.expiryDate;
  else if (!(data.expiryDate instanceof Date)) data.expiryDate = new Date(data.expiryDate);
  return data;
};

exports.getAll = async (req, res) => {
  try {
    const { type, active } = req.query;
    const where = {};
    if (type) where.type = type;
    if (active === 'true' || active === true) where.isActive = true;
    const masters = await prisma.master.findMany({ where, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    res.json(toApi(masters));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const master = await prisma.master.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!master) return res.status(404).json({ message: 'Master not found' });
    res.json(toApi(master));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const master = await prisma.master.create({ data: pickMaster(req.body) });
    res.status(201).json(toApi(master));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const master = await prisma.master.update({
      where: { id: parseInt(req.params.id, 10) },
      data: pickMaster(req.body),
    });
    if (!master) return res.status(404).json({ message: 'Master not found' });
    res.json(toApi(master));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const master = await prisma.master.delete({ where: { id: parseInt(req.params.id, 10) } });
    if (!master) return res.status(404).json({ message: 'Master not found' });
    res.json({ message: 'Master deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Upload an Excel file' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];

    if (!sheet) return res.status(400).json({ message: 'No sheet found' });

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = row.getCell(1).value;
      const code = row.getCell(2).value;
      const price = row.getCell(3).value;
      const quantity = row.getCell(4).value;
      const expiryDate = row.getCell(5).value;
      const description = row.getCell(6).value;
      if (name) {
        rows.push({
          type: 'Medicine',
          name: String(name).trim(),
          code: code ? String(code).trim() : undefined,
          price: price ? Number(price) : 0,
          quantity: quantity ? Number(quantity) : 0,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          description: description ? String(description).trim() : '',
        });
      }
    });

    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const existing = await prisma.master.findFirst({ where: { type: 'Medicine', name: row.name } });
      if (!existing) {
        await prisma.master.create({ data: row });
        imported++;
      } else {
        await prisma.master.update({ where: { id: existing.id }, data: row });
        skipped++;
      }
    }

    res.json({ message: `${imported} imported, ${skipped} updated`, imported, skipped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
