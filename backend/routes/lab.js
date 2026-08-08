const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { auth } = require('../middlewares/auth');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

router.use(auth);

router.get('/tests', labController.getTests);
router.post('/tests', labController.createTest);
router.post('/tests/import-excel', upload.single('file'), labController.bulkImportTests);
router.get('/tests/:id', labController.getTestById);
router.put('/tests/:id', labController.updateTest);
router.delete('/tests/:id', labController.removeTest);

router.get('/bills/collection-report', labController.collectionReport);
router.get('/bills', labController.getBills);
router.post('/bills', labController.createBill);
router.get('/bills/:id', labController.getBillById);
router.put('/bills/:id', labController.updateBill);
router.put('/bills/:id/payment', labController.addPayment);
router.delete('/bills/:id', labController.removeBill);
router.get('/bills/:id/pdf', labController.downloadPDF);

router.get('/results', labController.getResults);
router.post('/results', labController.createResult);
router.get('/results/:id', labController.getResultById);
router.put('/results/:id', labController.updateResult);
router.delete('/results/:id', labController.removeResult);
router.get('/results/:id/pdf', labController.downloadResultPDF);

module.exports = router;
