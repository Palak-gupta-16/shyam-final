const express = require('express');
const { reportsController } = require('../controllers');
const { authenticate, authorize, logActivity } = require('../middlewares');

const router = express.Router();

router.use(authenticate);

router.get(
  '/analytics',
  authorize('General_Manager', 'Director', 'Accounting', 'Store_Keeper', 'Mill_Supervisor'),
  logActivity('REPORTS_ANALYTICS_VIEW', 'Reports'),
  reportsController.getReportsAnalytics
);

module.exports = router;
