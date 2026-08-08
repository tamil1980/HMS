const express = require('express');
const router = express.Router();
const wardController = require('../controllers/wardController');
const { auth, adminOnly } = require('../middlewares/auth');

router.use(auth);

router.get('/', wardController.getWards);
router.get('/all', wardController.getAllWards);
router.get('/availability', wardController.availability);

router.post('/', adminOnly, wardController.createWard);
router.post('/rooms', adminOnly, wardController.createRoom);
router.post('/beds', adminOnly, wardController.createBed);
router.post('/beds/bulk', adminOnly, wardController.createBedsBulk);

router.put('/:id', adminOnly, wardController.updateWard);
router.put('/rooms/:id', adminOnly, wardController.updateRoom);
router.put('/beds/:id', adminOnly, wardController.updateBed);

router.delete('/:id', adminOnly, wardController.deleteWard);
router.delete('/rooms/:id', adminOnly, wardController.deleteRoom);
router.delete('/beds/:id', adminOnly, wardController.deleteBed);

module.exports = router;
