const express = require('express');
const router = express.Router();
const caseSheetController = require('../controllers/caseSheetController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', caseSheetController.getAll);
router.get('/patient/:patientId', caseSheetController.getByPatient);
router.get('/:id', caseSheetController.getById);
router.get('/:id/pdf', caseSheetController.downloadPDF);
router.post('/', caseSheetController.create);
router.put('/:id', caseSheetController.update);
router.delete('/:id', caseSheetController.remove);

module.exports = router;
