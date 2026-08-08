const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, adminOnly } = require('../middlewares/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);
router.put('/change-password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);

router.get('/users', auth, adminOnly, authController.listUsers);
router.post('/staff', auth, adminOnly, authController.createStaff);
router.put('/users/:id', auth, adminOnly, authController.updateUser);
router.delete('/users/:id', auth, adminOnly, authController.deleteUser);

module.exports = router;
