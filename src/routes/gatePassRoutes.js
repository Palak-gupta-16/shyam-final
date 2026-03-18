const express = require('express');
const { gatePassController } = require('../controllers');
const { authenticate, authorize, logActivity } = require('../middlewares');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create gate pass request
router.post('/',
  authorize('Guard', 'General_Manager', 'Director'),
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

// Mark gate pass entry
router.patch('/:id/mark-entered',
  authorize('Guard', 'General_Manager', 'Director'),
  logActivity('GATEPASS_MARK_ENTERED', 'GatePass'),
  gatePassController.markGatePassEntered
);

// Mark gate pass exit
router.patch('/:id/mark-exited',
  authorize('Guard', 'General_Manager', 'Director'),
  logActivity('GATEPASS_MARK_EXITED', 'GatePass'),
  gatePassController.markGatePassExited
);

// Get gate passes with filters
router.get('/',
  authorize('Guard', 'Director', 'General_Manager'),
  gatePassController.getGatePasses
);

// Get gate pass by ID
router.get('/status/pending',
  authorize('Guard', 'Director', 'General_Manager'),
  gatePassController.getPendingGatePasses
);

// Get gate pass by ID
router.get('/:id',
  authorize('Guard', 'Director', 'General_Manager'),
  gatePassController.getGatePassById
);

module.exports = router;
