const express = require('express');
const router = express.Router();
const { fareController } = require('../controllers');
const { authenticate, authorize, validate, logActivity } = require('../middlewares');
const { recordFareSchema, fareQuerySchema } = require('../validators/fareValidators');

// All routes require authentication
router.use(authenticate);

// Record fare for an order
router.post('/order/:orderId',
  authorize('Accounting', 'Director'),
  validate(recordFareSchema),
  logActivity('FARE_RECORD', 'Fare'),
  fareController.recordFare
);

// Get all fares
router.get('/',
  authorize('Accounting', 'General_Manager', 'Director'),
  validate(fareQuerySchema, 'query'),
  fareController.getFares
);

// Get fare by order ID
router.get('/order/:orderId',
  authorize('Accounting', 'General_Manager', 'Director'),
  fareController.getFareByOrderId
);

// Update fare
router.put('/order/:orderId',
  authorize('Accounting', 'Director'),
  validate(recordFareSchema),
  logActivity('FARE_UPDATE', 'Fare'),
  fareController.updateFare
);

// Delete fare
router.delete('/order/:orderId',
  authorize('Director'),
  logActivity('FARE_DELETE', 'Fare'),
  fareController.deleteFare
);

// Get fare statistics
router.get('/stats',
  authorize('Accounting', 'General_Manager', 'Director'),
  fareController.getFareStats
);

module.exports = router;