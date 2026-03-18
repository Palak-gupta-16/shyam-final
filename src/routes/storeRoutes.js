const express = require('express');
const { storeController } = require('../controllers');
const { authenticate, authorize, logActivity, validate } = require('../middlewares');
const {
  issueStoreItemSchema,
  approveStoreIssuanceSchema,
  rejectStoreIssuanceSchema,
  lifecycleUpdateSchema,
  getStoreIssuancesQuerySchema,
} = require('../validators');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Raise store request (backward-compatible endpoint)
router.post('/issue',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(issueStoreItemSchema),
  logActivity('STORE_REQUEST_RAISE', 'StoreIssuance'),
  storeController.issueStoreItem
);

// Preferred endpoint for raising request
router.post('/requests',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(issueStoreItemSchema),
  logActivity('STORE_REQUEST_RAISE', 'StoreIssuance'),
  storeController.issueStoreItem
);

// Approve raised request
router.patch('/requests/:id/approve',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(approveStoreIssuanceSchema),
  logActivity('STORE_REQUEST_APPROVE', 'StoreIssuance'),
  storeController.approveStoreIssuance
);

// Reject raised request
router.patch('/requests/:id/reject',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(rejectStoreIssuanceSchema),
  logActivity('STORE_REQUEST_REJECT', 'StoreIssuance'),
  storeController.rejectStoreIssuance
);

// Issue approved request
router.patch('/requests/:id/issue',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(lifecycleUpdateSchema),
  logActivity('STORE_REQUEST_ISSUE', 'StoreIssuance'),
  storeController.issueApprovedStoreItem
);

// Return issued item
router.patch('/requests/:id/return',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(lifecycleUpdateSchema),
  logActivity('STORE_RETURN', 'StoreIssuance'),
  storeController.returnStoreItem
);

// Backward-compatible return endpoint
router.patch('/return/:id',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(lifecycleUpdateSchema),
  logActivity('STORE_RETURN', 'StoreIssuance'),
  storeController.returnStoreItem
);

// Mark under repair
router.patch('/requests/:id/under-repair',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(lifecycleUpdateSchema),
  logActivity('STORE_UNDER_REPAIR', 'StoreIssuance'),
  storeController.markStoreItemUnderRepair
);

// Mark repaired
router.patch('/requests/:id/repair',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(lifecycleUpdateSchema),
  logActivity('STORE_REPAIR_COMPLETE', 'StoreIssuance'),
  storeController.markStoreItemRepaired
);

// Mark scrapped
router.patch('/requests/:id/scrap',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(lifecycleUpdateSchema),
  logActivity('STORE_SCRAP', 'StoreIssuance'),
  storeController.markStoreItemScrapped
);

// Get store issuances with filters
router.get('/issuances',
  authorize('Store_Keeper', 'General_Manager', 'Director'),
  validate(getStoreIssuancesQuerySchema, 'query'),
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
