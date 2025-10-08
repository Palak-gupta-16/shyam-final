const express = require('express');
const { inventoryController } = require('../controllers');
const { authenticate, authorize, logActivity, validate } = require('../middlewares');
const { createInventorySchema, updateInventorySchema } = require('../validators');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all inventory items
router.get('/',
  inventoryController.getInventory
);

// Add new inventory item
router.post('/',
  authorize('General_Manager', 'Director', 'Store_Keeper'),
  validate(createInventorySchema),
  logActivity('INVENTORY_ADD', 'Inventory'),
  inventoryController.addInventoryItem
);

// Update inventory item quantity
router.patch('/:id',
  authorize('General_Manager', 'Director', 'Store_Keeper'),
  validate(updateInventorySchema),
  logActivity('INVENTORY_UPDATE', 'Inventory'),
  inventoryController.updateInventoryItem
);

// Get inventory by type
router.get('/type/:type',
  inventoryController.getInventoryByType
);

// Get low stock items
router.get('/low-stock',
  authorize('General_Manager', 'Director', 'Store_Keeper'),
  inventoryController.getLowStockItems
);

// Get needed items and blocked orders
router.get('/needed-items',
  authorize('General_Manager', 'Director', 'Store_Keeper'),
  inventoryController.getNeededItems
);

// Reserve inventory for an order
router.post('/reserve',
  authorize('Store_Keeper', 'Purchasing', 'General_Manager', 'Director'),
  logActivity('INVENTORY_RESERVE', 'Inventory'),
  inventoryController.reserveInventory
);

// Search inventory items
router.get('/search',
  inventoryController.searchInventory
);

module.exports = router;
