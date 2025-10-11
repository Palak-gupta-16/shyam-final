const Joi = require('joi');

const recordFareSchema = Joi.object({
  fareType: Joi.string()
    .valid('given_by_us', 'given_by_other_party')
    .required()
    .messages({
      'any.only': 'Fare type must be either "given_by_us" or "given_by_other_party"',
      'string.empty': 'Fare type is required'
    }),
  
  amount: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.min': 'Amount cannot be negative',
      'any.required': 'Fare amount is required'
    }),
  
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const fareQuerySchema = Joi.object({
  fareType: Joi.string()
    .valid('given_by_us', 'given_by_other_party', 'all')
    .messages({
      'any.only': 'Fare type must be either "given_by_us", "given_by_other_party", or "all"'
    }),
  
  search: Joi.string()
    .trim()
    .messages({
      'string.base': 'Search must be a string'
    }),
  
  startDate: Joi.date()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .messages({
      'date.base': 'End date must be a valid date'
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
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

module.exports = {
  recordFareSchema,
  fareQuerySchema
};