const express = require('express');
const { orderController } = require('../controllers');
const { authenticate, authorize, logActivity, validate } = require('../middlewares');
const { 
  createOrderSchema, 
  emptyWeightSchema, 
  finalWeightSchema, 
  loadingCompleteSchema, 
  generateInvoiceSchema,
  addVehicleDetailsSchema,
  updateFareDetailsSchema,
  orderQuerySchema 
} = require('../validators');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create new order
router.post('/',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  validate(createOrderSchema),
  logActivity('ORDER_CREATE', 'Order'),
  orderController.createOrder
);

// Guard approve order
router.patch('/:id/guard-approve',
  authorize('Guard','Director','General_Manager'),
  logActivity('ORDER_GUARD_APPROVE', 'Order'),
  orderController.guardApprove
);

// Add vehicle details (NEW - after order creation)
router.patch('/:id/vehicle-details',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director', 'Guard'),
  validate(addVehicleDetailsSchema),
  logActivity('ORDER_ADD_VEHICLE', 'Order'),
  orderController.addVehicleDetails
);

// Update fare details (NEW - in billing phase)
router.patch('/:id/fare-details',
  authorize('Accounting', 'Director'),
  validate(updateFareDetailsSchema),
  logActivity('ORDER_UPDATE_FARE', 'Order'),
  orderController.updateFareDetails
);

// Update/Edit order (NEW)
router.patch('/:id',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  logActivity('ORDER_UPDATE', 'Order'),
  orderController.updateOrder
);

// Record empty weight
router.post('/:id/weight/empty',
  authorize('Weighbridge','Director','General_Manager'),
  validate(emptyWeightSchema),
  logActivity('ORDER_EMPTY_WEIGHT', 'Order'),
  orderController.recordEmptyWeight
);

// Ready for loading (informational)
router.patch('/:id/ready-loading',
  authorize('Weighbridge', 'Loading', 'General_Manager','Director'),
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
  authorize('Loading','Director','General_Manager'),
  logActivity('ORDER_ACCEPT_LOADING', 'Order'),
  orderController.acceptLoading
);

router.patch('/:id/accept-unloading',
  authorize('Unloading', 'Director', 'General_Manager'),
  logActivity('ORDER_ACCEPT_UNLOADING', 'Order'),
  orderController.acceptUnloading
);

router.post('/:id/unloading-complete',
  authorize('Unloading', 'Director', 'General_Manager'),
  logActivity('ORDER_UNLOADING_COMPLETE', 'Order'),
  orderController.unloadingComplete
);


// Loading complete
router.post('/:id/loading-complete',
  authorize('Loading','Director','General_Manager'),
  validate(loadingCompleteSchema),
  logActivity('ORDER_LOADING_COMPLETE', 'Order'),
  orderController.loadingComplete
);

// Record final weight
router.post('/:id/weight/final',
  authorize('Weighbridge','Director','General_Manager'),
  validate(finalWeightSchema),
  logActivity('ORDER_FINAL_WEIGHT', 'Order'),
  orderController.recordFinalWeight
);

// Generate invoice
router.post('/:id/generate-invoice',
  authorize('Accounting','Director'),
  validate(generateInvoiceSchema),
  logActivity('ORDER_GENERATE_INVOICE', 'Order'),
  orderController.generateInvoice
);

// Exit order
router.patch('/:id/exit',
  authorize('Guard','Director','General_Manager'),
  logActivity('ORDER_EXIT', 'Order'),
  orderController.exitOrder
);

// Get orders with filters and pagination
router.get('/',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Accounting'),
  validate(orderQuerySchema, 'query'),
  orderController.getOrders
);

router.get('/by-status',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Guard', 'Accounting'),
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
