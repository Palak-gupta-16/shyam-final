const express = require('express');
const { millController } = require('../controllers');
const { authenticate, authorize, logActivity } = require('../middlewares');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create hourly mill report
router.post('/hourly',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  logActivity('MILL_HOURLY_REPORT', 'MillHourlyReport'),
  millController.createHourlyReport
);

// Create daily mill summary
router.post('/daily',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  logActivity('MILL_DAILY_SUMMARY', 'MillDailySummary'),
  millController.createDailySummary
);

// Stock take - increment finished product inventory
router.post('/stock-take',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  logActivity('MILL_STOCK_TAKE', 'Inventory'),
  millController.stockTake
);

// Get hourly reports with filters
router.get('/hourly',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  millController.getHourlyReports
);

// Edit hourly report (NEW)
router.put('/hourly/:id',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  logActivity('MILL_EDIT_HOURLY_REPORT', 'MillHourlyReport'),
  millController.editHourlyReport
);

// Get daily summaries with filters
router.get('/daily',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  millController.getDailySummaries
);

// Edit daily summary (NEW)
router.put('/daily/:id',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  logActivity('MILL_EDIT_DAILY_SUMMARY', 'MillDailySummary'),
  millController.editDailySummary
);

// Get available raw materials for mill production
router.get('/raw-materials',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  millController.getAvailableRawMaterials
);

// Get available finished products
router.get('/finished-products',
  authorize('Mill_Supervisor', 'General_Manager', 'Director'),
  millController.getAvailableFinishedProducts
);

module.exports = router;
