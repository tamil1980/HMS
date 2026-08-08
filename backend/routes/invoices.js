const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', invoiceController.getAll);
router.get('/collection-report', invoiceController.collectionReport);
router.get('/:id', invoiceController.getById);
router.get('/:id/pdf', invoiceController.downloadPDF);
router.post('/', invoiceController.create);
router.put('/:id', invoiceController.update);
router.put('/:id/payment', invoiceController.addPayment);
router.delete('/:id', invoiceController.remove);

module.exports = router;
