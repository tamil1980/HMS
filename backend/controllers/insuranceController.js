const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');
const { nextId } = require('../utils/sequences');

const toInt = (v) => parseInt(v, 10);
const patientBrief = { id: true, name: true, phone: true, patientId: true };

// ---------- Insurance Companies ----------
exports.getCompanies = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: search } }, { companyCode: { contains: search } }];
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const companies = await prisma.insuranceCompany.findMany({
      where,
      include: { _count: { select: { claims: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(toApi(companies));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const { name, address, phone, email, tpaName, contactPerson } = req.body;
    const company = await prisma.insuranceCompany.create({
      data: { companyCode: await nextId('INS', 4), name, address, phone, email, tpaName, contactPerson },
    });
    res.status(201).json(toApi(company));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { name, address, phone, email, tpaName, contactPerson, isActive } = req.body;
    const company = await prisma.insuranceCompany.update({ where: { id }, data: { name, address, phone, email, tpaName, contactPerson, isActive } });
    res.json(toApi(company));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.insuranceCompany.delete({ where: { id } });
    res.json({ message: 'Insurance company deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Insurance Claims ----------
exports.getClaims = async (req, res) => {
  try {
    const { companyId, patient, status, billType } = req.query;
    const where = {};
    if (companyId) where.companyId = toInt(companyId);
    if (patient) where.patientId = toInt(patient);
    if (status) where.status = status;
    if (billType) where.billType = billType;
    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, companyCode: true, tpaName: true } },
        patient: { select: patientBrief },
      },
      orderBy: { filedAt: 'desc' },
    });
    res.json(toApi(claims));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createClaim = async (req, res) => {
  try {
    const { companyId, patientId, billType, billId, policyNumber, claimAmount, status, notes } = req.body;
    const claim = await prisma.insuranceClaim.create({
      data: {
        claimId: await nextId('CLM', 5),
        companyId: toInt(companyId),
        patientId: toInt(patientId),
        billType,
        billId: billId ? toInt(billId) : null,
        policyNumber,
        claimAmount: claimAmount || 0,
        status: status || 'Submitted',
        notes,
      },
    });
    res.status(201).json(toApi(claim));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateClaim = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { billType, billId, policyNumber, claimAmount, approvedAmount, status, notes, settledAt } = req.body;
    const data = {};
    if (billType) data.billType = billType;
    if (billId !== undefined) data.billId = billId ? toInt(billId) : null;
    if (policyNumber !== undefined) data.policyNumber = policyNumber;
    if (claimAmount !== undefined) data.claimAmount = claimAmount;
    if (approvedAmount !== undefined) data.approvedAmount = approvedAmount;
    if (status) {
      data.status = status;
      data.settledAt = status === 'Settled' ? new Date() : settledAt || undefined;
    }
    if (notes !== undefined) data.notes = notes;
    const claim = await prisma.insuranceClaim.update({ where: { id }, data });
    res.json(toApi(claim));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteClaim = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.insuranceClaim.delete({ where: { id } });
    res.json({ message: 'Claim deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
