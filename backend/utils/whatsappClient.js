const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const findChrome = () => CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));

let client = null;
let starting = null;
let connected = false;
let qrCode = null;
let qrRaw = null;
let phoneNumber = null;
let state = 'idle';
let lastError = null;

const setState = (s) => { state = s; };

const buildClient = () => {
  const executablePath = findChrome();
  const puppeteer = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  };
  if (executablePath) puppeteer.executablePath = executablePath;

  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', '.wwebjs_auth') }),
    puppeteer,
  });

  c.on('qr', async (qr) => {
    qrRaw = qr;
    connected = false;
    setState('qr');
    try {
      qrCode = await QRCode.toDataURL(qr, { width: 440, margin: 1 });
      console.log('[whatsapp] New QR generated - scan it from the Settings page.');
    } catch (err) {
      console.error('[whatsapp] QR render error:', err.message);
      qrCode = null;
    }
  });

  c.on('authenticated', () => {
    qrCode = null;
    qrRaw = null;
    setState('authenticated');
  });

  c.on('auth_failure', (msg) => {
    lastError = msg;
    connected = false;
    setState('auth_failure');
  });

  c.on('ready', () => {
    connected = true;
    qrCode = null;
    lastError = null;
    phoneNumber = c.info && c.info.wid ? c.info.wid.user : null;
    setState('connected');
    console.log('[whatsapp] Connected as', phoneNumber);
  });

  c.on('disconnected', (reason) => {
    connected = false;
    qrCode = null;
    setState('disconnected:' + reason);
    console.log('[whatsapp] Disconnected:', reason);
  });

  c.on('message', () => {});

  return c;
};

const start = async () => {
  if (client && connected) return getStatus();
  if (starting) return starting;

  starting = (async () => {
    try {
      client = buildClient();
      await client.initialize();
    } catch (err) {
      lastError = err.message;
      setState('error');
      console.error('[whatsapp] initialize error:', err.message);
      client = null;
    } finally {
      starting = null;
    }
  })();

  return starting;
};

const stop = async () => {
  if (client) {
    try { await client.destroy(); } catch (err) { /* ignore */ }
  }
  client = null;
  connected = false;
  qrCode = null;
  qrRaw = null;
  phoneNumber = null;
  setState('stopped');
};

const getStatus = () => ({
  connected,
  qr: qrCode,
  phone: phoneNumber,
  state,
  chromeFound: Boolean(findChrome()),
  lastError,
});

const toWhatsAppNumber = (phone) => {
  let digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
};

const sendMessage = async (phone, text) => {
  if (!client || !connected) throw new Error('WhatsApp is not connected');
  const number = toWhatsAppNumber(phone);
  if (!number) throw new Error('Invalid phone number: ' + phone);
  const chatId = number + '@c.us';
  return client.sendMessage(chatId, text);
};

const shutdown = () => {
  if (client) {
    try { client.destroy(); } catch (err) { /* ignore */ }
  }
};

process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });

module.exports = { start, stop, getStatus, sendMessage, toWhatsAppNumber };
