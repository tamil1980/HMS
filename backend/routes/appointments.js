const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', appointmentController.getAll);
router.get('/today', appointmentController.getTodayAppointments);
router.get('/patient/:patientId', appointmentController.getByPatient);
router.get('/:id', appointmentController.getById);
router.post('/', appointmentController.create);
router.put('/:id', appointmentController.update);
router.delete('/:id', appointmentController.remove);

module.exports = router;
