const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');

// ---------- Wards ----------
exports.getWards = async (req, res) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          include: { beds: { where: { isActive: true }, orderBy: { bedNumber: 'asc' } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(toApi(wards));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllWards = async (req, res) => {
  try {
    const wards = await prisma.ward.findMany({
      include: { rooms: { include: { beds: true } }, _count: { select: { admissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(toApi(wards));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createWard = async (req, res) => {
  try {
    const { name, type, floor } = req.body;
    const ward = await prisma.ward.create({ data: { name, type: type || 'General', floor } });
    res.status(201).json(toApi(ward));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateWard = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, type, floor, isActive } = req.body;
    const ward = await prisma.ward.update({ where: { id }, data: { name, type, floor, isActive } });
    res.json(toApi(ward));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteWard = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.ward.delete({ where: { id } });
    res.json({ message: 'Ward deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Rooms ----------
exports.createRoom = async (req, res) => {
  try {
    const { wardId, roomNumber, type, rate, capacity } = req.body;
    const room = await prisma.room.create({
      data: { wardId: parseInt(wardId, 10), roomNumber, type: type || 'General', rate: rate || 0, capacity: capacity || 1 },
    });
    res.status(201).json(toApi(room));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { roomNumber, type, rate, capacity, isActive } = req.body;
    const room = await prisma.room.update({ where: { id }, data: { roomNumber, type, rate, capacity, isActive } });
    res.json(toApi(room));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.room.delete({ where: { id } });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Beds ----------
exports.createBed = async (req, res) => {
  try {
    const { roomId, bedNumber, status } = req.body;
    const bed = await prisma.bed.create({ data: { roomId: parseInt(roomId, 10), bedNumber, status: status || 'Available' } });
    res.status(201).json(toApi(bed));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBedsBulk = async (req, res) => {
  try {
    const { roomId, count, prefix } = req.body;
    const room = await prisma.room.findUnique({ where: { id: parseInt(roomId, 10) } });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const start = room.capacity + 1;
    const data = [];
    for (let i = 0; i < parseInt(count, 10); i++) {
      data.push({ roomId: room.id, bedNumber: `${prefix || room.roomNumber}-${start + i}` });
    }
    await prisma.bed.createMany({ data });
    await prisma.room.update({ where: { id: room.id }, data: { capacity: start - 1 + parseInt(count, 10) } });
    res.status(201).json({ message: `${data.length} beds created` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBed = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { bedNumber, status, isActive } = req.body;
    const bed = await prisma.bed.update({ where: { id }, data: { bedNumber, status, isActive } });
    res.json(toApi(bed));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBed = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.bed.delete({ where: { id } });
    res.json({ message: 'Bed deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bed availability overview across the hospital
exports.availability = async (req, res) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { isActive: true },
          include: { beds: { where: { isActive: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    let totalBeds = 0;
    let available = 0;
    const byWard = wards.map((w) => {
      let wTotal = 0;
      let wAvailable = 0;
      for (const room of w.rooms) {
        wTotal += room.beds.length;
        wAvailable += room.beds.filter((b) => b.status === 'Available').length;
      }
      totalBeds += wTotal;
      available += wAvailable;
      return { _id: w.id, name: w.name, total: wTotal, available: wAvailable, occupied: wTotal - wAvailable };
    });
    res.json({ totalBeds, available, occupied: totalBeds - available, byWard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
