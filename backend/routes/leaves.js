const express = require('express');
const router = express.Router();
const doctorLeaveController = require('../controllers/doctorLeaveController');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', doctorLeaveController.getLeaves);
router.get('/availability', doctorLeaveController.checkAvailability);
router.post('/', doctorLeaveController.createLeave);
router.put('/:id', doctorLeaveController.updateLeave);
router.delete('/:id', doctorLeaveController.deleteLeave);

module.exports = router;
