const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { auth, adminOnly } = require('../middlewares/auth');

router.use(auth);

router.get('/', employeeController.getEmployees);
router.get('/attendance', employeeController.getAttendance);
router.get('/salaries', employeeController.getSalaries);
router.get('/:id', employeeController.getEmployee);

router.post('/', adminOnly, employeeController.createEmployee);
router.post('/attendance', employeeController.markAttendance);
router.post('/attendance/bulk', employeeController.markBulkAttendance);
router.post('/salaries/generate', adminOnly, employeeController.generateSalaries);

router.put('/:id', adminOnly, employeeController.updateEmployee);
router.put('/salaries/:id', adminOnly, employeeController.updateSalary);

router.delete('/:id', adminOnly, employeeController.deleteEmployee);
router.delete('/attendance/:id', employeeController.deleteAttendance);
router.delete('/salaries/:id', adminOnly, employeeController.deleteSalary);

module.exports = router;
