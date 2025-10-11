// Export all controllers from a single file for easier importing
const authController = require('./authController');
const orderController = require('./orderController');
const inventoryController = require('./inventoryController');
const gatePassController = require('./gatePassController');
const millController = require('./millController');
const storeController = require('./storeController');
const fareController = require('./fareController');

module.exports = {
  authController,
  orderController,
  inventoryController,
  gatePassController,
  millController,
  storeController,
  fareController
};
