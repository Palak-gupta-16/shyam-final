const express = require('express');
const { orderController } = require('../controllers');
const { authenticate, authorize, logActivity, validate } = require('../middlewares');
const {
  createOrderSchema,
  emptyWeightSchema,
  finalWeightSchema,
  loadingCompleteSchema,
  generateInvoiceSchema,
  orderQuerySchema
} = require('../validators');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Debug order validation (development only)
router.post('/debug-validation',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  orderController.debugOrderValidation
);

// Create new order
router.post('/',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  // validate(createOrderSchema), // Temporarily disabled for debugging
  logActivity('ORDER_CREATE', 'Order'),
  orderController.createOrder
);

// Check product availability for dispatch
router.get('/:id/check-availability',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  orderController.checkProductAvailability
);

// Approve dispatch (when dispatch button is clicked)
router.patch('/:id/approve-dispatch',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  logActivity('ORDER_APPROVE_DISPATCH', 'Order'),
  orderController.approveDispatch
);

// Guard approve order
router.patch('/:id/guard-approve',
  authorize('Guard', 'Director'),
  logActivity('ORDER_GUARD_APPROVE', 'Order'),
  orderController.guardApprove
);

// Record empty weight
router.post('/:id/weight/empty',
  authorize('Weighbridge', 'Director'),
  validate(emptyWeightSchema),
  logActivity('ORDER_EMPTY_WEIGHT', 'Order'),
  orderController.recordEmptyWeight
);

// Ready for loading (informational)
router.patch('/:id/ready-loading',
  authorize('Weighbridge', 'Loading', 'General_Manager', 'Director'),
  logActivity('ORDER_READY_LOADING', 'Order'),
  orderController.readyForLoading
);
router.patch('/:id/ready-unloading',
  authorize('Weighbridge', 'Unloading', 'General_Manager', 'Director'),
  logActivity('ORDER_READY_UNLOADING', 'Order'),
  orderController.readyForUnloading
);


// Accept loading
router.patch('/:id/accept-loading',
  authorize('Loading', 'Director'),
  logActivity('ORDER_ACCEPT_LOADING', 'Order'),
  orderController.acceptLoading
);

router.patch('/:id/accept-unloading',
  authorize('Unloading', 'Director'),
  logActivity('ORDER_ACCEPT_UNLOADING', 'Order'),
  orderController.acceptUnloading
);

router.post('/:id/unloading-complete',
  authorize('Unloading', 'Director'),
  logActivity('ORDER_UNLOADING_COMPLETE', 'Order'),
  orderController.unloadingComplete
);


// Loading complete
router.post('/:id/loading-complete',
  authorize('Loading', 'Director'),
  validate(loadingCompleteSchema),
  logActivity('ORDER_LOADING_COMPLETE', 'Order'),
  orderController.loadingComplete
);

// Record final weight
router.post('/:id/weight/final',
  authorize('Weighbridge', 'Director'),
  validate(finalWeightSchema),
  logActivity('ORDER_FINAL_WEIGHT', 'Order'),
  orderController.recordFinalWeight
);

// Generate invoice
router.post('/:id/generate-invoice',
  authorize('Accounting', 'Director'),
  validate(generateInvoiceSchema),
  logActivity('ORDER_GENERATE_INVOICE', 'Order'),
  orderController.generateInvoice
);

// Move order to gate
router.patch('/:id/move-to-gate',
  authorize('Accounting', 'General_Manager', 'Director'),
  logActivity('ORDER_MOVE_TO_GATE', 'Order'),
  orderController.moveToGate
);

// Exit order
router.patch('/:id/exit',
  authorize('Guard', 'Director'),
  logActivity('ORDER_EXIT', 'Order'),
  orderController.exitOrder
);

// Get orders with filters and pagination
router.get('/',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing'),
  validate(orderQuerySchema, 'query'),
  orderController.getOrders
);

router.get('/by-status',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Guard'),
  orderController.getOrdersByStatus
);

// Get blocked orders
router.get('/blocked',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing'),
  orderController.getBlockedOrders
);

// Try to fulfill blocked order
router.patch('/:id/fulfill-blocked',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  logActivity('ORDER_FULFILL_BLOCKED', 'Order'),
  orderController.tryFulfillBlockedOrder
);

// Get order by ID
router.get('/:id',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Guard', 'Weighbridge', 'Loading', 'Unloading', 'Accounting'),
  orderController.getOrderById
);

module.exports = router;
