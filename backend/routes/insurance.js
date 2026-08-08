const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/companies', insuranceController.getCompanies);
router.post('/companies', insuranceController.createCompany);
router.put('/companies/:id', insuranceController.updateCompany);
router.delete('/companies/:id', insuranceController.deleteCompany);

router.get('/claims', insuranceController.getClaims);
router.post('/claims', insuranceController.createClaim);
router.put('/claims/:id', insuranceController.updateClaim);
router.delete('/claims/:id', insuranceController.deleteClaim);

module.exports = router;
