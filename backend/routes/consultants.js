const express = require('express');
const router = express.Router();
const consultantController = require('../controllers/consultantController');
const { auth, adminOnly } = require('../middlewares/auth');

router.use(auth);

router.get('/', consultantController.getAll);
router.get('/:id', consultantController.getById);
router.post('/', consultantController.create);
router.put('/:id', adminOnly, consultantController.update);
router.delete('/:id', adminOnly, consultantController.remove);

module.exports = router;
