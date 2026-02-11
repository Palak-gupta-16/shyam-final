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

router.get(
  '/users',
  authenticate,
  checkRoleAssignmentPermission,
  logActivity('VIEW_ALL_USERS', 'User'),
  authController.getAllUsers
);

router.put(
  '/users/:id',
  authenticate,
  checkRoleAssignmentPermission,
  logActivity('EDIT_USER', 'User'),
  authController.editUser
);

// Delete user
router.delete(
  '/users/:id',
  authenticate,
  checkRoleAssignmentPermission,
  logActivity('DELETE_USER', 'User'),
  authController.deleteUser
);


module.exports = router;
