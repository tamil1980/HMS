const express = require('express');
const router = express.Router();
const ipController = require('../controllers/ipController');
const { auth } = require('../middlewares/auth');

router.use(auth);

// Admissions
router.get('/admissions', ipController.getAdmissions);
router.get('/admissions/:id', ipController.getAdmissionById);
router.post('/admissions', ipController.createAdmission);
router.put('/admissions/:id', ipController.updateAdmission);
router.post('/admissions/:id/discharge', ipController.dischargeAdmission);
router.post('/admissions/:id/allocate-bed', ipController.allocateBed);
router.post('/admissions/:id/transfer-bed', ipController.transferBed);
router.post('/admissions/:id/release-bed', ipController.releaseBed);
router.delete('/admissions/:id', ipController.removeAdmission);

// Bill components
router.get('/components', ipController.getComponents);
router.post('/components', ipController.createComponent);
router.put('/components/:id', ipController.updateComponent);
router.delete('/components/:id', ipController.removeComponent);

// Bills
router.get('/bills', ipController.getBills);
router.get('/bills/:id', ipController.getBillById);
router.post('/bills', ipController.createBill);
router.put('/bills/:id', ipController.updateBill);
router.put('/bills/:id/payment', ipController.addPayment);
router.delete('/bills/:id', ipController.removeBill);
router.get('/bills/:id/pdf', ipController.downloadBillPDF);

// Monitoring
router.get('/monitoring', ipController.getMonitoring);
router.post('/monitoring', ipController.createMonitoring);
router.put('/monitoring/:id', ipController.updateMonitoring);
router.delete('/monitoring/:id', ipController.removeMonitoring);

// IP Case sheets
router.get('/case-sheets', ipController.getIPCaseSheets);
router.get('/case-sheets/:id', ipController.getIPCaseSheetById);
router.post('/case-sheets', ipController.createIPCaseSheet);
router.put('/case-sheets/:id', ipController.updateIPCaseSheet);
router.delete('/case-sheets/:id', ipController.removeIPCaseSheet);
router.get('/case-sheets/:id/pdf', ipController.downloadIPCaseSheetPDF);

// Discharge summary
router.get('/discharge', ipController.getDischargeSummaries);
router.get('/discharge/admission/:admissionId', ipController.getDischargeSummaryByAdmission);
router.get('/discharge/:id/pdf', ipController.downloadDischargePDF);
router.get('/discharge/:id', ipController.getDischargeSummaryById);
router.post('/discharge', ipController.createDischargeSummary);
router.put('/discharge/:id', ipController.updateDischargeSummary);
router.delete('/discharge/:id', ipController.removeDischargeSummary);

module.exports = router;
