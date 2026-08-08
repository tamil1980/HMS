const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { auth, adminOnly } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/', auth, settingController.getSettings);
router.put('/', auth, adminOnly, settingController.updateSettings);
router.post('/upload-logo', auth, adminOnly, upload.single('logo'), settingController.uploadLogo);

module.exports = router;
