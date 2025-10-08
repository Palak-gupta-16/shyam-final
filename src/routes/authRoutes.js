const express = require('express');
const { authController } = require('../controllers');
const { authenticate, checkRoleAssignmentPermission, logActivity } = require('../middlewares');
const { validate } = require('../middlewares');
const { registerSchema, loginSchema } = require('../validators');

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', 
  validate(loginSchema),
  authController.login
);

// Routes that require authentication
router.post('/register',
  validate(registerSchema),
  authenticate,
  checkRoleAssignmentPermission,
  logActivity('USER_REGISTER', 'User'),
  authController.register
);

router.get('/profile',
  authenticate,
  authController.getProfile
);

module.exports = router;
