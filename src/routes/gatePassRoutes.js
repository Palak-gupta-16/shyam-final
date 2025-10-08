const express = require('express');
const { gatePassController } = require('../controllers');
const { authenticate, authorize, logActivity } = require('../middlewares');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create gate pass request
router.post('/',
  authorize( 'Director', 'General_Manager'),
  logActivity('GATEPASS_CREATE', 'GatePass'),
  gatePassController.createGatePass
);

// Approve gate pass
router.patch('/:id/approve',
  authorize('Director', 'General_Manager'),
  logActivity('GATEPASS_APPROVE', 'GatePass'),
  gatePassController.approveGatePass
);

// Reject gate pass
router.patch('/:id/reject',
  authorize('Director', 'General_Manager'),
  logActivity('GATEPASS_REJECT', 'GatePass'),
  gatePassController.rejectGatePass
);

// Get gate passes with filters
router.get('/',
  authorize('Director', 'General_Manager'),
  gatePassController.getGatePasses
);

// Get gate pass by ID
router.get('/:id',
  authorize('Director', 'General_Manager'),
  gatePassController.getGatePassById
);

// Get pending gate passes
router.get('/status/pending',
  authorize('Director', 'General_Manager'),
  gatePassController.getPendingGatePasses
);

module.exports = router;
