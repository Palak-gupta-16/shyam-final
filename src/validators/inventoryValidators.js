const Joi = require('joi');

const createInventorySchema = Joi.object({
  type: Joi.string()
    .valid('finished_product', 'raw_material', 'store_item', 'waste_material')
    .required()
    .messages({
      'any.only': 'Type must be one of: finished_product, raw_material, store_item, waste_material',
      'string.empty': 'Type is required'
    }),
  
  status: Joi.string()
    .valid('available', 'needed', 'low_stock', 'out_of_stock')
    .default('available')
    .messages({
      'any.only': 'Status must be one of: available, needed, low_stock, out_of_stock'
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
  
  dimensions: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Dimensions cannot exceed 100 characters'
    }),
  
  // Sizes array for finished products (mandatory for finished_product type)
  sizes: Joi.when('type', {
    is: 'finished_product',
    then: Joi.array()
      .items(
        Joi.object({
          dimension: Joi.string().required(),
          quantity: Joi.number().min(0).required(),
          reservedQuantity: Joi.number().min(0).default(0),
          availableQuantity: Joi.number().min(0).required()
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one size is required for finished products',
        'any.required': 'Sizes are required for finished products'
      }),
    otherwise: Joi.array().optional()
  }),
  
  // Quantity for non-finished products (not used for finished_product)
  quantity: Joi.when('type', {
    is: 'finished_product',
    then: Joi.number().optional(),
    otherwise: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity cannot be negative',
        'any.required': 'Quantity is required'
      })
  }),
  
  length: Joi.number()
    .min(0)
    .optional()
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
    }),
  
  minimumStock: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Minimum stock must be a number',
      'number.min': 'Minimum stock cannot be negative'
    })
});

const updateInventorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 200 characters'
    }),
  
  type: Joi.string()
    .valid('finished_product', 'raw_material', 'store_item', 'waste_material')
    .messages({
      'any.only': 'Type must be one of: finished_product, raw_material, store_item, waste_material'
    }),
  
  dimensions: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Dimensions cannot exceed 100 characters'
    }),
  
  quantity: Joi.number()
    .min(0)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative'
    }),
  
  status: Joi.string()
    .valid('available', 'needed', 'low_stock', 'out_of_stock')
    .messages({
      'any.only': 'Status must be one of: available, needed, low_stock, out_of_stock'
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
    }),
  
  minimumStock: Joi.number()
    .min(0)
    .messages({
      'number.base': 'Minimum stock must be a number',
      'number.min': 'Minimum stock cannot be negative'
    })
});

const addSizeSchema = Joi.object({
  dimension: Joi.string()
    .required()
    .messages({
      'string.empty': 'Dimension is required',
      'any.required': 'Dimension is required'
    }),
  
  quantity: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative',
      'any.required': 'Quantity is required'
    })
});

module.exports = {
  createInventorySchema,
  updateInventorySchema,
  addSizeSchema
};
