const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');
const { nextId } = require('../utils/sequences');

// ---------- Employees (Staff Details) ----------
exports.getEmployees = async (req, res) => {
  try {
    const { search, department, isActive } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { employeeId: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (department) where.department = department;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(toApi(employees));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(toApi(employee));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const data = { ...req.body };
    data.employeeId = data.employeeId || await nextId('EMP');
    if (data.joinDate) data.joinDate = new Date(data.joinDate);
    const employee = await prisma.employee.create({ data });
    res.status(201).json(toApi(employee));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    if (data.joinDate) data.joinDate = new Date(data.joinDate);
    const employee = await prisma.employee.update({ where: { id }, data });
    res.json(toApi(employee));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.employee.delete({ where: { id } });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Attendance ----------
exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, date, month, year } = req.query;
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.date = { gte: start, lt: end };
    }
    if (month && year) {
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }
    const attendance = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeId: true, designation: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(toApi(attendance));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, date, inTime, outTime, status, notes } = req.body;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: parseInt(employeeId, 10), date: d } },
      update: { inTime: inTime || null, outTime: outTime || null, status: status || 'Present', notes },
      create: { employeeId: parseInt(employeeId, 10), date: d, inTime, outTime, status: status || 'Present', notes },
    });
    res.json(toApi(record));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markBulkAttendance = async (req, res) => {
  try {
    const { date, status, employeeIds } = req.body;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    let count = 0;
    for (const id of employeeIds || []) {
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: parseInt(id, 10), date: d } },
        update: { status: status || 'Present' },
        create: { employeeId: parseInt(id, 10), date: d, status: status || 'Present' },
      });
      count += 1;
    }
    res.json({ message: `${count} attendance records saved` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.attendance.delete({ where: { id } });
    res.json({ message: 'Attendance deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Salary ----------
exports.getSalaries = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const where = {};
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);
    if (status) where.status = status;
    const salaries = await prisma.salary.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeId: true, designation: true, department: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json(toApi(salaries));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Generates salary rows for all active employees for a given month/year
exports.generateSalaries = async (req, res) => {
  try {
    const { month, year } = req.body;
    const employees = await prisma.employee.findMany({ where: { isActive: true } });
    let created = 0;
    let updated = 0;
    for (const emp of employees) {
      const existing = await prisma.salary.findUnique({
        where: { employeeId_month_year: { employeeId: emp.id, month: parseInt(month, 10), year: parseInt(year, 10) } },
      });
      const net = emp.salary || 0;
      if (existing) {
        await prisma.salary.update({
          where: { id: existing.id },
          data: { basic: net, netSalary: net },
        });
        updated += 1;
      } else {
        await prisma.salary.create({
          data: { employeeId: emp.id, month: parseInt(month, 10), year: parseInt(year, 10), basic: net, netSalary: net },
        });
        created += 1;
      }
    }
    res.json({ message: `${created} created, ${updated} updated` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSalary = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { basic, allowance, deduction, netSalary, status, notes, paidAt } = req.body;
    const data = {};
    if (basic !== undefined) data.basic = basic;
    if (allowance !== undefined) data.allowance = allowance;
    if (deduction !== undefined) data.deduction = deduction;
    if (netSalary !== undefined) data.netSalary = netSalary;
    if (status !== undefined) {
      data.status = status;
      data.paidAt = status === 'Paid' ? new Date() : null;
    }
    if (paidAt) data.paidAt = new Date(paidAt);
    if (notes !== undefined) data.notes = notes;
    const salary = await prisma.salary.update({ where: { id }, data });
    res.json(toApi(salary));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSalary = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.salary.delete({ where: { id } });
    res.json({ message: 'Salary record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
