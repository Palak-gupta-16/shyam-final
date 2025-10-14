const express = require('express');
const router = express.Router();
const neededItemsController = require('../controllers/neededItemsController');
const { authenticate, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(authenticate);

// Get all needed items with filtering
router.get('/',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing'),
  neededItemsController.getNeededItems
);

// Get fulfillable items (items that can be fulfilled with current inventory)
router.get('/fulfillable',
  authorize('General_Manager', 'Director', 'Store_Keeper'),
  neededItemsController.getFulfillableItems
);

// Fulfill needed items (manual fulfillment)
router.post('/fulfill',
  authorize('General_Manager', 'Director', 'Store_Keeper'),
  neededItemsController.fulfillNeededItems
);

// Check fulfillment status for specific items
router.post('/check-status',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing'),
  neededItemsController.checkFulfillmentStatus
);

// Auto-detect needed items from an order
router.post('/auto-detect/:orderId',
  authorize('General_Manager', 'Director', 'Store_Keeper', 'Purchasing'),
  neededItemsController.autoDetectNeededItems
);

// Delete needed item (admin only)
router.delete('/:id',
  authorize('General_Manager', 'Director'),
  neededItemsController.deleteNeededItem
);

module.exports = router;