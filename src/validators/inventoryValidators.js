const Joi = require('joi');

const dimensionSchema = Joi.object({
  dimension: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Dimension is required',
      'string.min': 'Dimension must be at least 1 character long',
      'string.max': 'Dimension cannot exceed 100 characters'
    }),
  
  quantity: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative'
    }),
  
  bundles: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Bundles must be a number',
      'number.min': 'Bundles cannot be negative'
    }),
  
  minimumStock: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Minimum stock must be a number',
      'number.min': 'Minimum stock cannot be negative'
    }),
  
  maxStock: Joi.number()
    .min(0)
    .allow(null)
    .messages({
      'number.base': 'Maximum stock must be a number',
      'number.min': 'Maximum stock cannot be negative'
    })
});

const createInventorySchema = Joi.object({
  sku: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .allow('')
    .messages({
      'string.min': 'SKU must be at least 2 characters long',
      'string.max': 'SKU cannot exceed 50 characters'
    }),
  
  type: Joi.string()
    .valid('finished_product', 'raw_material', 'store_item')
    .required()
    .messages({
      'any.only': 'Type must be one of: finished_product, raw_material, store_item',
      'string.empty': 'Type is required'
    }),
  
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 200 characters'
    }),
  
  // For finished products
  dimensions: Joi.when('type', {
    is: 'finished_product',
    then: Joi.array()
      .items(dimensionSchema)
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one dimension is required for finished products',
        'any.required': 'Dimensions are required for finished products'
      }),
    otherwise: Joi.forbidden()
  }),
  
  // For raw materials and store items
  quantity: Joi.when('type', {
    is: Joi.valid('raw_material', 'store_item'),
    then: Joi.number()
      .min(0)
      .default(0)
      .messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity cannot be negative'
      }),
    otherwise: Joi.forbidden()
  }),
  
  bundles: Joi.when('type', {
    is: Joi.valid('raw_material', 'store_item'),
    then: Joi.number()
      .min(0)
      .default(0)
      .messages({
        'number.base': 'Bundles must be a number',
        'number.min': 'Bundles cannot be negative'
      }),
    otherwise: Joi.forbidden()
  }),
  
  minimumStock: Joi.when('type', {
    is: Joi.valid('raw_material', 'store_item'),
    then: Joi.number()
      .min(0)
      .default(0)
      .messages({
        'number.base': 'Minimum stock must be a number',
        'number.min': 'Minimum stock cannot be negative'
      }),
    otherwise: Joi.forbidden()
  }),
  
  maxStock: Joi.when('type', {
    is: Joi.valid('raw_material', 'store_item'),
    then: Joi.number()
      .min(0)
      .allow(null)
      .messages({
        'number.base': 'Maximum stock must be a number',
        'number.min': 'Maximum stock cannot be negative'
      }),
    otherwise: Joi.forbidden()
  }),
  
  length: Joi.number()
    .min(0)
    .allow(null)
    .messages({
      'number.base': 'Length must be a number',
      'number.min': 'Length cannot be negative'
    }),
  
  unit: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .default('pieces')
    .messages({
      'string.min': 'Unit must be at least 1 character long',
      'string.max': 'Unit cannot exceed 20 characters'
    }),
  
  location: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Location cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    })
});

const updateInventorySchema = Joi.object({
  dimensionId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Dimension ID is required',
      'any.required': 'Dimension ID is required'
    }),
  
  quantity: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative',
      'any.required': 'Quantity is required'
    }),
  
  bundles: Joi.number()
    .min(0)
    .messages({
      'number.base': 'Bundles must be a number',
      'number.min': 'Bundles cannot be negative'
    }),
  
  action: Joi.string()
    .valid('set', 'add', 'subtract')
    .default('set')
    .messages({
      'any.only': 'Action must be one of: set, add, subtract'
    })
});

const addDimensionSchema = Joi.object({
  dimension: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Dimension is required',
      'string.min': 'Dimension must be at least 1 character long',
      'string.max': 'Dimension cannot exceed 100 characters'
    }),
  
  quantity: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative'
    }),
  
  bundles: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Bundles must be a number',
      'number.min': 'Bundles cannot be negative'
    }),
  
  minimumStock: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Minimum stock must be a number',
      'number.min': 'Minimum stock cannot be negative'
    }),
  
  maxStock: Joi.number()
    .min(0)
    .allow(null)
    .messages({
      'number.base': 'Maximum stock must be a number',
      'number.min': 'Maximum stock cannot be negative'
    })
});

module.exports = {
  createInventorySchema,
  updateInventorySchema,
  addDimensionSchema
};
