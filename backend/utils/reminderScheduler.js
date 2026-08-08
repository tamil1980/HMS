const prisma = require('../db/prisma');
const whatsapp = require('./whatsappClient');

const parseTime = (str) => {
  if (!str) return null;
  const s = String(str).trim().toUpperCase();
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    if (h === 12) h = 0;
    if (ampm[3] === 'PM') h += 12;
    return { hours: h, minutes: m };
  }
  const tf = s.match(/^(\d{1,2}):(\d{2})$/);
  if (tf) return { hours: parseInt(tf[1], 10), minutes: parseInt(tf[2], 10) };
  return null;
};

const tzParts = (date, tz) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute, sec: +p.second };
};

const tzOffsetMs = (utcMs, tz) => {
  const p = tzParts(new Date(utcMs), tz);
  const asUTC = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.sec);
  return asUTC - utcMs;
};

const tzDateTime = (y, m, d, hh, mm, tz) => {
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffsetMs(utcGuess, tz);
  return new Date(utcGuess - off);
};

const appointmentEpoch = (appt, tz) => {
  const time = parseTime(appt.appointmentTime);
  if (!time) return null;
  const p = tzParts(appt.appointmentDate, tz);
  return tzDateTime(p.y, p.m, p.d, time.hours, time.minutes, tz).getTime();
};

const formatDateInTz = (date, tz) => {
  const p = tzParts(date, tz);
  return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`;
};

const buildMessage = (appt, settings, tz) => {
  const patient = appt.patient || {};
  const consultant = appt.consultant || {};
  const lines = [
    `Dear ${patient.name || 'Patient'},`,
    '',
    `This is a reminder from ${settings.hospitalName || 'Hospital'} that you have an appointment on ${formatDateInTz(appt.appointmentDate, tz)} at ${appt.appointmentTime}.`,
  ];
  if (consultant.name) lines.push(`Doctor: ${consultant.name}${consultant.specialization ? ' (' + consultant.specialization + ')' : ''}`);
  if (appt.tokenNumber) lines.push(`Token Number: ${appt.tokenNumber}`);
  lines.push('');
  lines.push('Please arrive a few minutes early.');
  if (settings.phone) lines.push(`For rescheduling or queries, contact ${settings.phone}.`);
  lines.push('');
  lines.push(`Thank you,\n${settings.hospitalName || 'Hospital'}`);
  return lines.join('\n');
};

const sendReminderFor = async (appt, settings, tz) => {
  const phone = appt.patient && appt.patient.phone;
  if (!phone) return { ok: false, reason: 'no-phone' };
  const text = buildMessage(appt, settings, tz);
  try {
    await whatsapp.sendMessage(phone, text);
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
    console.log(`[reminder] Sent to ${phone} for appointment ${appt.appointmentId || appt.id} at ${appt.appointmentTime}`);
    return { ok: true };
  } catch (err) {
    console.error(`[reminder] Failed for appointment ${appt.id}:`, err.message);
    return { ok: false, reason: err.message };
  }
};

const checkReminders = async () => {
  try {
    const settings = await prisma.hospitalSetting.findFirst();
    if (!settings || !settings.appointmentReminderEnabled) return { sent: 0, skipped: 'disabled' };
    if (!whatsapp.getStatus().connected) return { sent: 0, skipped: 'whatsapp-not-connected' };

    const tz = settings.timeZone || 'Asia/Kolkata';
    const now = Date.now();
    const todayParts = tzParts(new Date(now), tz);
    const startOfDay = tzDateTime(todayParts.y, todayParts.m, todayParts.d, 0, 0, tz).getTime();
    const offsetMinutes = settings.reminderBeforeMinutes || 60;

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'Scheduled',
        reminderSentAt: null,
        appointmentDate: { gte: new Date(startOfDay) },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        consultant: { select: { id: true, name: true, specialization: true } },
      },
    });

    let sent = 0;
    for (const appt of appointments) {
      const apptEpoch = appointmentEpoch(appt, tz);
      if (!apptEpoch) continue;
      const reminderTime = apptEpoch - offsetMinutes * 60000;
      if (now >= reminderTime && now < apptEpoch) {
        const result = await sendReminderFor(appt, settings, tz);
        if (result.ok) sent += 1;
      }
    }
    return { sent, checked: appointments.length };
  } catch (err) {
    console.error('[reminder] check error:', err.message);
    return { sent: 0, error: err.message };
  }
};

let timer = null;

const startReminderScheduler = () => {
  if (timer) return;
  console.log('[reminder] Scheduler started (checks every 60s)');
  timer = setInterval(() => { checkReminders(); }, 60 * 1000);
  return timer;
};

const stopReminderScheduler = () => {
  if (timer) { clearInterval(timer); timer = null; }
};

module.exports = { checkReminders, startReminderScheduler, stopReminderScheduler, parseTime, buildMessage, appointmentEpoch };
