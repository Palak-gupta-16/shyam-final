const express = require('express');
const { storeController } = require('../controllers');
const { authenticate, authorize, logActivity } = require('../middlewares');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Issue store item
router.post('/issue',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  logActivity('STORE_ISSUE', 'StoreIssuance'),
  storeController.issueStoreItem
);

// Return store item
router.patch('/return/:id',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  logActivity('STORE_RETURN', 'StoreIssuance'),
  storeController.returnStoreItem
);

// Get store issuances with filters
router.get('/issuances',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  storeController.getStoreIssuances
);

// Get pending returns
router.get('/pending-returns',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  storeController.getPendingReturns
);

// Get store issuance by ID
router.get('/issuances/:id',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  storeController.getStoreIssuanceById
);

// Get issuance statistics
router.get('/stats',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  storeController.getIssuanceStats
);

module.exports = router;
