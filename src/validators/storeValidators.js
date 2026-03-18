const Joi = require('joi');

const issueStoreItemSchema = Joi.object({
  issuedTo: Joi.string().trim().min(2).max(120).required(),
  item: Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().trim().min(1).max(30).default('pieces'),
    description: Joi.string().trim().max(500).allow('').optional(),
  }).required(),
  purpose: Joi.string().trim().max(500).allow('').optional(),
  department: Joi.string().trim().max(120).allow('').optional(),
  employeeId: Joi.string().trim().max(120).allow('').optional(),
  returnExpected: Joi.boolean().default(false),
  returnDate: Joi.date().optional(),
  remarks: Joi.string().trim().max(500).allow('').optional(),
});

const approveStoreIssuanceSchema = Joi.object({
  approvedQuantity: Joi.number().positive().required(),
  remarks: Joi.string().trim().max(500).allow('').optional(),
});

const rejectStoreIssuanceSchema = Joi.object({
  reason: Joi.string().trim().min(2).max(500).required(),
  remarks: Joi.string().trim().max(500).allow('').optional(),
});

const lifecycleUpdateSchema = Joi.object({
  quantity: Joi.number().positive().optional(),
  remarks: Joi.string().trim().max(500).allow('').optional(),
});

const getStoreIssuancesQuerySchema = Joi.object({
  issuedTo: Joi.string().trim().optional(),
  department: Joi.string().trim().optional(),
  status: Joi.string()
    .valid('raised', 'approved', 'rejected', 'issued', 'returned', 'under_repair', 'repaired', 'scrapped')
    .optional(),
  returnExpected: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(200).default(25),
});

module.exports = {
  issueStoreItemSchema,
  approveStoreIssuanceSchema,
  rejectStoreIssuanceSchema,
  lifecycleUpdateSchema,
  getStoreIssuancesQuerySchema,
};
