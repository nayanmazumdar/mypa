const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { registerValidator, loginValidator } = require('../validators/auth.validator');

// Public
router.post('/register', validate(registerValidator), authController.register);
router.post('/login', validate(loginValidator), authController.login);

// Authenticated (no shop required)
router.get('/profile', authenticate, authController.getProfile);
router.post('/select-shop', authenticate, authController.selectShop);
router.post('/create-shop', authenticate, authController.setupShop);
router.post('/set-passcode', authenticate, authController.setPasscode);

// Shop-scoped (admin only)
router.get('/staff', authenticate, authorize('admin'), authController.getStaff);
router.post('/staff', authenticate, authorize('admin'), authController.addStaff);

module.exports = router;
