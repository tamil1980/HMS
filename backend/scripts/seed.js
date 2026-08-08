// Seeds default users, hospital settings and master data for all 20 modules.
// Run with `npm run db:seed`. Also imported by server.js on startup.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');

const seed = async () => {
  const users = [
    { name: 'Admin', email: 'admin@hospital.com', password: 'admin123', role: 'admin' },
    { name: 'Dr. Staff', email: 'doctor@hospital.com', password: 'doctor123', role: 'doctor' },
    { name: 'Nurse', email: 'nurse@hospital.com', password: 'nurse123', role: 'nurse' },
    { name: 'Reception', email: 'reception@hospital.com', password: 'reception123', role: 'receptionist' },
    { name: 'Lab User', email: 'lab@hospital.com', password: 'lab123', role: 'lab' },
    { name: 'Pharmacy User', email: 'pharmacy@hospital.com', password: 'pharmacy123', role: 'pharmacy' },
    { name: 'Accountant', email: 'accountant@hospital.com', password: 'accountant123', role: 'accountant' },
    { name: 'Staff User', email: 'staff@hospital.com', password: 'staff123', role: 'staff' },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: { name: u.name, email: u.email, password: await bcrypt.hash(u.password, 10), role: u.role },
      });
      console.log(`Created user: ${u.email} / ${u.password} (${u.role})`);
    }
  }

  const settingsCount = await prisma.hospitalSetting.count();
  if (settingsCount === 0) {
    await prisma.hospitalSetting.create({ data: { hospitalName: 'My Hospital' } });
    console.log('Created default hospital settings');
  }

  const wardCount = await prisma.ward.count();
  if (wardCount === 0) {
    const ward = await prisma.ward.create({ data: { name: 'General Ward', type: 'General', floor: '1' } });
    const room = await prisma.room.create({ data: { wardId: ward.id, roomNumber: 'G-101', type: 'General', rate: 500, capacity: 4 } });
    const beds = [];
    for (let i = 1; i <= 4; i++) {
      beds.push({ roomId: room.id, bedNumber: `G-101-${i}` });
    }
    await prisma.bed.createMany({ data: beds });
    console.log('Created default ward/room/beds');
  }

  const radiologyCount = await prisma.radiologyTest.count();
  if (radiologyCount === 0) {
    const tests = [
      { name: 'Chest X-Ray', category: 'X-Ray', price: 250, gstRate: 0 },
      { name: 'X-Ray Skull (AP/Lat)', category: 'X-Ray', price: 300, gstRate: 0 },
      { name: 'CT Brain (Plain)', category: 'CT Scan', price: 1800, gstRate: 0 },
      { name: 'CT Abdomen (Plain)', category: 'CT Scan', price: 2500, gstRate: 0 },
      { name: 'MRI Brain', category: 'MRI', price: 4500, gstRate: 0 },
      { name: 'MRI Knee Joint', category: 'MRI', price: 3200, gstRate: 0 },
      { name: 'USG Abdomen & Pelvis', category: 'Ultrasound', price: 700, gstRate: 0 },
      { name: 'USG Obstetric', category: 'Ultrasound', price: 800, gstRate: 0 },
      { name: 'Echocardiography', category: 'Ultrasound', price: 1500, gstRate: 0 },
    ];
    for (const t of tests) {
      const existing = await prisma.radiologyTest.findFirst({ where: { name: t.name } });
      if (!existing) await prisma.radiologyTest.create({ data: t });
    }
    console.log('Created default radiology tests');
  }

  const insuranceCount = await prisma.insuranceCompany.count();
  if (insuranceCount === 0) {
    const companies = [
      { name: 'Star Health Insurance', tpaName: 'MDIndia', phone: '1800201105' },
      { name: 'HDFC ERGO Health', tpaName: 'MediAssist', phone: '1800222866' },
      { name: 'New India Assurance', tpaName: 'New India TPA', phone: '1800209348' },
      { name: 'Bajaj Allianz Health', tpaName: 'Genins', phone: '1800202950' },
    ];
    for (const c of companies) {
      const existing = await prisma.insuranceCompany.findFirst({ where: { name: c.name } });
      if (!existing) await prisma.insuranceCompany.create({ data: c });
    }
    console.log('Created default insurance companies');
  }
};

if (require.main === module) {
  seed()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
