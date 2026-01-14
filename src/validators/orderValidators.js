const Joi = require('joi');

const createOrderSchema = Joi.object({
  type: Joi.string()
    .valid('dispatch', 'purchase')
    .required()
    .messages({
      'any.only': 'Order type must be either dispatch or purchase',
      'string.empty': 'Order type is required'
    }),
  
  customerOrSupplier: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Customer or supplier name is required',
      'string.min': 'Customer or supplier name must be at least 2 characters long',
      'string.max': 'Customer or supplier name cannot exceed 200 characters'
    }),
  
  vehicle: Joi.object({
    number: Joi.string()
      .trim()
      .min(4)
      .max(20)
      .required()
      .messages({
        'string.empty': 'Vehicle number is required',
        'string.min': 'Vehicle number must be at least 4 characters long',
        'string.max': 'Vehicle number cannot exceed 20 characters'
      }),

      driverNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.empty': 'Driver phone number is required',
      'string.pattern.base': 'Driver phone number must be a valid 10-digit number'
    }),
    
    driverName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Driver name is required',
        'string.min': 'Driver name must be at least 2 characters long',
        'string.max': 'Driver name cannot exceed 100 characters'
      })
  }).optional(),
  
  
  
  products: Joi.array()
    .items(
      Joi.object({
        inventoryItemId: Joi.string()
          .trim()
          .required()
          .messages({
            'string.empty': 'Inventory item ID is required'
          }),
        name: Joi.string()
          .trim()
          .min(2)
          .max(200)
          .required()
          .messages({
            'string.empty': 'Product name is required',
            'string.min': 'Product name must be at least 2 characters long',
            'string.max': 'Product name cannot exceed 200 characters'
          }),
        
        dimensions: Joi.string()
          .trim()
          .max(100)
          .allow('')
          .messages({
            'string.max': 'Dimensions cannot exceed 100 characters'
          }),
        
        length: Joi.string()
          .trim()
          .max(50)
          .allow('')
          .messages({
            'string.max': 'Length cannot exceed 50 characters'
          }),
        
        quantity: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'number.base': 'Quantity must be a number',
            'number.integer': 'Quantity must be a whole number',
            'number.min': 'Quantity must be at least 1',
            'any.required': 'Quantity is required'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one product is required',
      'any.required': 'Products list is required'
    })
});

const emptyWeightSchema = Joi.object({
  emptyWeight: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Empty weight must be a number',
      'number.min': 'Empty weight cannot be negative',
      'any.required': 'Empty weight is required'
    }),
  
  slipUrl: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Slip URL cannot exceed 500 characters'
    })
});

const finalWeightSchema = Joi.object({
  finalWeight: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Final weight must be a number',
      'number.min': 'Final weight cannot be negative',
      'any.required': 'Final weight is required'
    }),
  
  slipUrl: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Slip URL cannot exceed 500 characters'
    })
});

const bundleDetailSchema = Joi.object({
  bundleNumber: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Bundle number must be a number',
      'number.integer': 'Bundle number must be a whole number',
      'number.min': 'Bundle number must be at least 1'
    }),
  weight: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Bundle weight must be a number',
      'number.min': 'Bundle weight cannot be negative',
      'any.required': 'Bundle weight is required'
    }),
  size: Joi.string()
    .trim()
    .allow('')
    .max(100)
    .optional()
    .messages({
      'string.max': 'Bundle size cannot exceed 100 characters'
    }),
  length: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Bundle length must be a number',
      'number.min': 'Bundle length cannot be negative'
    })
});

const loadingCompleteSchema = Joi.object({
  bundles: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Bundles must be a number',
      'number.integer': 'Bundles must be a whole number',
      'number.min': 'Bundles must be at least 1'
    }),

  weightPerBundle: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Weight per bundle must be a number',
      'number.min': 'Weight per bundle cannot be negative'
    }),

  totalLoadedWeight: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Total loaded weight must be a number',
      'number.min': 'Total loaded weight cannot be negative'
    }),

  productLoads: Joi.array()
    .items(
      Joi.object({
        productIndex: Joi.number()
          .integer()
          .min(0)
          .required()
          .messages({
            'number.base': 'Product index must be a number',
            'number.integer': 'Product index must be a whole number',
            'number.min': 'Product index cannot be negative',
            'any.required': 'Product index is required'
          }),
        bundles: Joi.number()
          .integer()
          .min(1)
          .optional()
          .messages({
            'number.base': 'Bundles must be a number',
            'number.integer': 'Bundles must be a whole number',
            'number.min': 'Bundles must be at least 1'
          }),
        totalWeight: Joi.number()
          .min(0)
          .optional()
          .messages({
            'number.base': 'Total weight must be a number',
            'number.min': 'Total weight cannot be negative'
          }),
        bundleDetails: Joi.array()
          .items(bundleDetailSchema)
          .min(1)
          .required()
          .messages({
            'any.required': 'Bundle details are required for each product'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one product load entry is required',
      'any.required': 'Product loads are required'
    }),

  notes: Joi.string()
    .trim()
    .allow('')
    .max(500)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const generateInvoiceSchema = Joi.object({

  amount: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.min': 'Amount cannot be negative',
      'any.required': 'Invoice amount is required'
    }),

  // pdfUrl: Joi.string()
  //   .uri()
  //   .optional()
  //   .messages({
  //     'string.uri': 'PDF URL must be a valid URL'
  //   }),

  RatePerUnit: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Rate per unit must be a number',
      'number.min': 'Rate per unit cannot be negative'
    }),

  TaxPercentage: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Tax percentage must be a number',
      'number.min': 'Tax percentage cannot be negative',
      'number.max': 'Tax percentage cannot exceed 100'
    }),

  invoiceNotes: Joi.string()
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.base': 'Invoice notes must be a string'
    })
});


const addVehicleDetailsSchema = Joi.object({
  vehicle: Joi.object({
    number: Joi.string()
      .trim()
      .min(4)
      .max(20)
      .required()
      .messages({
        'string.empty': 'Vehicle number is required',
        'string.min': 'Vehicle number must be at least 4 characters long',
        'string.max': 'Vehicle number cannot exceed 20 characters'
      }),
    driverNumber: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
        'string.empty': 'Driver phone number is required',
        'string.pattern.base': 'Driver phone number must be a valid 10-digit number'
      }),
    driverName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Driver name is required',
        'string.min': 'Driver name must be at least 2 characters long',
        'string.max': 'Driver name cannot exceed 100 characters'
      })
  }).required()
});

const updateFareDetailsSchema = Joi.object({
  amount: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Fare amount must be a number',
      'number.min': 'Fare amount cannot be negative',
      'any.required': 'Fare amount is required'
    }),
  paidBy: Joi.string()
    .valid('our_side', 'other_party')
    .required()
    .messages({
      'any.only': 'Paid by must be either our_side or other_party',
      'any.required': 'Paid by is required'
    }),
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const updateOrderSchema = Joi.object({
  customerOrSupplier: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Customer or supplier name must be at least 2 characters long',
      'string.max': 'Customer or supplier name cannot exceed 200 characters'
    }),
  products: Joi.array()
    .items(
      Joi.object({
        inventoryItemId: Joi.string().trim().required(),
        name: Joi.string().trim().min(2).max(200).required(),
        dimensions: Joi.string().trim().max(100).allow(''),
        length: Joi.string().trim().max(50).allow(''),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .min(1)
    .messages({
      'array.min': 'At least one product is required'
    })
});

const orderQuerySchema = Joi.object({
  status: Joi.string()
    .trim()
    .messages({
      'string.base': 'Status must be a string'
    }),
  
  type: Joi.string()
    .valid('dispatch', 'purchase')
    .messages({
      'any.only': 'Type must be either dispatch or purchase'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1'
    }),
  
  perPage: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(25)
    .messages({
      'number.base': 'Per page must be a number',
      'number.integer': 'Per page must be a whole number',
      'number.min': 'Per page must be at least 1',
      'number.max': 'Per page cannot exceed 500'
    })
});

module.exports = {
  createOrderSchema,
  emptyWeightSchema,
  finalWeightSchema,
  loadingCompleteSchema,
  generateInvoiceSchema,
  addVehicleDetailsSchema,
  updateFareDetailsSchema,
  updateOrderSchema,
  orderQuerySchema
};
