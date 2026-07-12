const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const upload = require('../middlewares/upload.middleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, minLength: 8, example: "Password1" }
 *               phone: { type: string, example: "9876543210" }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post('/register', validate(registerValidator), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, example: "Password1" }
 *     responses:
 *       200: { description: Login successful, returns JWT token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(loginValidator), authController.login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile data }
 *       401: { description: Unauthorized }
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user permissions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role and permissions map }
 */
router.get('/permissions', authenticate, (req, res) => {
  const { PERMISSIONS } = require('../middlewares/auth.middleware');
  const role = req.user.role;
  const userPermissions = {};
  for (const [perm, roles] of Object.entries(PERMISSIONS)) {
    userPermissions[perm] = roles.includes(role);
  }
  res.json({ success: true, data: { role, permissions: userPermissions } });
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update user profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: Profile updated }
 */
router.put('/profile', authenticate, upload.single('avatar'), authController.updateProfile);

/**
 * @swagger
 * /api/auth/shop:
 *   put:
 *     tags: [Auth]
 *     summary: Update shop details
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               gst_number: { type: string }
 *     responses:
 *       200: { description: Shop updated }
 */
router.put('/shop', authenticate, authController.updateShop);

/**
 * @swagger
 * /api/auth/select-shop:
 *   post:
 *     tags: [Auth]
 *     summary: Select active shop for multi-shop users
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shop_id]
 *             properties:
 *               shop_id: { type: integer }
 *     responses:
 *       200: { description: Shop selected, returns new token }
 */
router.post('/select-shop', authenticate, authController.selectShop);

/**
 * @swagger
 * /api/auth/create-shop:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new shop
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               gst_number: { type: string }
 *     responses:
 *       201: { description: Shop created }
 */
router.post('/create-shop', authenticate, authController.setupShop);

/**
 * @swagger
 * /api/auth/set-passcode:
 *   post:
 *     tags: [Auth]
 *     summary: Set a 4-digit login PIN
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passcode, current_password]
 *             properties:
 *               passcode: { type: string, pattern: "^\\d{4}$", example: "1234" }
 *               current_password: { type: string }
 *     responses:
 *       200: { description: Passcode set }
 *       401: { description: Invalid current password }
 */
router.post('/set-passcode', authenticate, authController.setPasscode);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change account password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Invalid current password }
 */
router.post('/change-password', authenticate, authController.changePassword);
router.post('/choose-role', authenticate, authController.chooseRole);

/**
 * @swagger
 * /api/auth/staff:
 *   get:
 *     tags: [Auth]
 *     summary: Get all staff members (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of staff members }
 *       403: { description: Admin access required }
 */
router.get('/staff', authenticate, authorize('admin'), authController.getStaff);

/**
 * @swagger
 * /api/auth/staff:
 *   post:
 *     tags: [Auth]
 *     summary: Add a staff member (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               phone: { type: string }
 *               role: { type: string, enum: [staff, manager], default: staff }
 *     responses:
 *       201: { description: Staff member added }
 *       403: { description: Admin access required }
 */
router.post('/staff', authenticate, authorize('admin'), authController.addStaff);

module.exports = router;
