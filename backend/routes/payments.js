const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth, requireRole } = require('../middlewares/auth');

router.use(auth);

router.get('/', requireRole('admin', 'accountant', 'receptionist', 'staff'), paymentController.getPayments);
router.post('/', requireRole('admin', 'accountant', 'receptionist', 'staff'), paymentController.recordPayment);
router.delete('/:id', requireRole('admin', 'accountant'), paymentController.deletePayment);

module.exports = router;
