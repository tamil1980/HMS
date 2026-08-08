const prisma = require('../db/prisma');
const { toApi } = require('../utils/serialize');

const getOrCreateSettings = async () => {
  let settings = await prisma.hospitalSetting.findFirst();
  if (!settings) {
    settings = await prisma.hospitalSetting.create({ data: { hospitalName: 'My Hospital' } });
  }
  return settings;
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(toApi(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await getOrCreateSettings();
    settings = await prisma.hospitalSetting.update({ where: { id: settings.id }, data: req.body });
    res.json(toApi(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    let settings = await getOrCreateSettings();
    settings = await prisma.hospitalSetting.update({
      where: { id: settings.id },
      data: { logo: `/uploads/${req.file.filename}` },
    });
    res.json(toApi(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
