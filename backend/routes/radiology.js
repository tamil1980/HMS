const express = require('express');
const router = express.Router();
const radiologyController = require('../controllers/radiologyController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/tests', radiologyController.getTests);
router.post('/tests', radiologyController.createTest);
router.put('/tests/:id', radiologyController.updateTest);
router.delete('/tests/:id', radiologyController.deleteTest);

router.get('/bills', radiologyController.getBills);
router.get('/bills/:id', radiologyController.getBillById);
router.post('/bills', radiologyController.createBill);
router.put('/bills/:id', radiologyController.updateBill);
router.put('/bills/:id/payment', radiologyController.addPayment);
router.delete('/bills/:id', radiologyController.deleteBill);

router.get('/reports', radiologyController.getReports);
router.get('/reports/:id', radiologyController.getReportById);
router.post('/reports', radiologyController.createReport);
router.put('/reports/:id', radiologyController.updateReport);
router.delete('/reports/:id', radiologyController.deleteReport);

module.exports = router;
