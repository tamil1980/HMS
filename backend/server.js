require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const prisma = require('./db/prisma');
const authController = require('./controllers/authController');
const whatsapp = require('./utils/whatsappClient');
const { startReminderScheduler } = require('./utils/reminderScheduler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/consultants', require('./routes/consultants'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/case-sheets', require('./routes/caseSheets'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/masters', require('./routes/masters'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/ip', require('./routes/ip'));
app.use('/api/reminders', require('./routes/reminders'));

// ---- Modules added in the full rebuild ----
app.use('/api/employees', require('./routes/employees'));       // Module 18
app.use('/api/nurses', require('./routes/nurses'));             // Module 9
app.use('/api/leaves', require('./routes/leaves'));             // Module 8
app.use('/api/wards', require('./routes/wards'));               // Module 10
app.use('/api/radiology', require('./routes/radiology'));       // Module 13
app.use('/api/insurance', require('./routes/insurance'));       // Module 16
app.use('/api/payments', require('./routes/payments'));         // Module 15
app.use('/api/reports', require('./routes/reports'));           // Module 19

app.get('/api/users', authController.listUsers);
app.get('/', (req, res) => res.send('Hospital OP backend is running'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await prisma.$connect();
  console.log('TiDB connected via Prisma');

  try {
    const { seed } = require('./scripts/seed');
    await seed();
  } catch (err) {
    console.error('Seeding error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  whatsapp.start().catch((err) => console.error('WhatsApp auto-start failed:', err.message));
  startReminderScheduler();
};

start().catch((err) => {
  console.error('Database connection error:', err);
  process.exit(1);
});
