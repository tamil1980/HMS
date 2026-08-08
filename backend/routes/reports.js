const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth, requireRole } = require('../middlewares/auth');

router.use(auth);

router.get('/daily', requireRole('admin', 'accountant', 'staff'), reportController.daily);
router.get('/monthly', requireRole('admin', 'accountant', 'staff'), reportController.monthly);
router.get('/yearly', requireRole('admin', 'accountant', 'staff'), reportController.yearly);

module.exports = router;
