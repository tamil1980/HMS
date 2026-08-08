const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', patientController.getAll);
router.get('/:id', patientController.getById);
router.get('/:id/qr', patientController.downloadQR);
router.post('/', patientController.create);
router.put('/:id', patientController.update);
router.delete('/:id', patientController.remove);

module.exports = router;
