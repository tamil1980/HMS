const express = require('express');
const router = express.Router();
const nurseController = require('../controllers/nurseController');
const { auth, adminOnly } = require('../middlewares/auth');

router.use(auth);

router.get('/', nurseController.getNurses);
router.get('/duties', nurseController.getDutySchedules);
router.get('/:id', nurseController.getNurse);

router.post('/', adminOnly, nurseController.createNurse);
router.post('/duties', nurseController.setDuty);

router.put('/:id', adminOnly, nurseController.updateNurse);

router.delete('/:id', adminOnly, nurseController.deleteNurse);
router.delete('/duties', nurseController.removeDuty);

module.exports = router;
