// Export all validators from a single file for easier importing
const { registerSchema, loginSchema } = require('./authValidators');
const { 
  createOrderSchema, 
  emptyWeightSchema, 
  finalWeightSchema, 
  loadingCompleteSchema, 
  generateInvoiceSchema,
  addVehicleDetailsSchema,
  updateFareDetailsSchema,
  updateOrderSchema,
  orderQuerySchema 
} = require('./orderValidators');
const { createInventorySchema, updateInventorySchema, addSizeSchema } = require('./inventoryValidators');

module.exports = {
  // Auth validators
  registerSchema,
  loginSchema,
  
  // Order validators
  createOrderSchema,
  emptyWeightSchema,
  finalWeightSchema,
  loadingCompleteSchema,
  generateInvoiceSchema,
  addVehicleDetailsSchema,
  updateFareDetailsSchema,
  updateOrderSchema,
  orderQuerySchema,
  
  // Inventory validators
  createInventorySchema,
  updateInventorySchema,
  addSizeSchema
};
