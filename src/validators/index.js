// Export all validators from a single file for easier importing
const { registerSchema, loginSchema } = require('./authValidators');
const { 
  createOrderSchema, 
  emptyWeightSchema, 
  finalWeightSchema, 
  loadingCompleteSchema, 
  generateInvoiceSchema,
  orderQuerySchema 
} = require('./orderValidators');
const { createInventorySchema, updateInventorySchema } = require('./inventoryValidators');

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
  orderQuerySchema,
  
  // Inventory validators
  createInventorySchema,
  updateInventorySchema
};
