const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const whatsapp = require('../utils/whatsappClient');
const { checkReminders, startReminderScheduler } = require('../utils/reminderScheduler');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/status', async (req, res) => {
  const settings = await prisma.hospitalSetting.findFirst();
  res.json({
    whatsapp: whatsapp.getStatus(),
    settings: settings
      ? {
          appointmentReminderEnabled: settings.appointmentReminderEnabled,
          reminderBeforeMinutes: settings.reminderBeforeMinutes,
          whatsappEnabled: settings.whatsappEnabled,
        }
      : null,
  });
});

router.post('/connect', async (req, res) => {
  try {
    await whatsapp.start();
    res.json(whatsapp.getStatus());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await whatsapp.stop();
    res.json(whatsapp.getStatus());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/run', async (req, res) => {
  try {
    const result = await checkReminders();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/send-test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const result = await whatsapp.sendMessage(phone, message || 'Test message from Hospital OP system');
    res.json({ ok: true, id: result.id._serialized });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
