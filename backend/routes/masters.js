const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { auth } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: 'uploads/' });

router.use(auth);

router.get('/', masterController.getAll);
router.get('/:id', masterController.getById);
router.post('/', masterController.create);
router.put('/:id', masterController.update);
router.delete('/:id', masterController.remove);
router.post('/import-excel', upload.single('file'), masterController.bulkImport);

module.exports = router;
