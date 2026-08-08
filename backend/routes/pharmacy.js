const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const { auth } = require('../middlewares/auth');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

router.use(auth);

router.get('/medicines', pharmacyController.getMedicines);
router.post('/medicines', pharmacyController.createMedicine);
router.post('/medicines/import-excel', upload.single('file'), pharmacyController.bulkImportMedicines);
router.get('/medicines/:id', pharmacyController.getMedicineById);
router.put('/medicines/:id', pharmacyController.updateMedicine);
router.put('/medicines/:id/stock', pharmacyController.adjustStock);
router.delete('/medicines/:id', pharmacyController.removeMedicine);

router.get('/suppliers', pharmacyController.getSuppliers);
router.post('/suppliers', pharmacyController.createSupplier);
router.put('/suppliers/:id', pharmacyController.updateSupplier);
router.delete('/suppliers/:id', pharmacyController.removeSupplier);

router.get('/grns/template', pharmacyController.downloadGRNTemplate);
router.post('/grns/import-excel', upload.single('file'), pharmacyController.bulkImportGRN);
router.get('/grns', pharmacyController.getGRNs);
router.post('/grns', pharmacyController.createGRN);
router.get('/grns/:id', pharmacyController.getGRNById);
router.put('/grns/:id', pharmacyController.updateGRN);
router.delete('/grns/:id', pharmacyController.removeGRN);
router.get('/grns/:id/pdf', pharmacyController.downloadGRNPDF);

router.get('/bills/collection-report', pharmacyController.collectionReport);
router.get('/bills', pharmacyController.getBills);
router.post('/bills', pharmacyController.createBill);
router.get('/bills/:id', pharmacyController.getBillById);
router.put('/bills/:id', pharmacyController.updateBill);
router.put('/bills/:id/payment', pharmacyController.addPayment);
router.delete('/bills/:id', pharmacyController.removeBill);
router.get('/bills/:id/pdf', pharmacyController.downloadPDF);

router.get('/returns/report', pharmacyController.returnsReport);
router.get('/returns', pharmacyController.getReturns);
router.post('/returns', pharmacyController.createReturn);
router.get('/returns/:id', pharmacyController.getReturnById);
router.get('/returns/:id/pdf', pharmacyController.downloadReturnPDF);
router.delete('/returns/:id', pharmacyController.removeReturn);

router.get('/stock-report', pharmacyController.stockReport);

module.exports = router;
