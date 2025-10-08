// Export all middleware from a single file for easier importing
const { authenticate, authorize, canAssignPrivilegedRole, checkRoleAssignmentPermission } = require('./auth');
const { logActivity } = require('./activityLogger');
const { validate } = require('./validation');

module.exports = {
  authenticate,
  authorize,
  canAssignPrivilegedRole,
  checkRoleAssignmentPermission,
  logActivity,
  validate
};
