const QRCode = require('qrcode');

const generateQR = async (data) => {
  try {
    const qrData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    return qrCode;
  } catch (err) {
    console.error('QR Generation error:', err);
    return null;
  }
};

module.exports = generateQR;
