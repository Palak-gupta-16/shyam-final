// Export all models from a single file for easier importing
const User = require('./User');
const Order = require('./Order');
const Inventory = require('./Inventory');
const GatePass = require('./GatePass');
const MillHourlyReport = require('./MillHourlyReport');
const MillDailySummary = require('./MillDailySummary');
const StoreIssuance = require('./StoreIssuance');
const ActivityLog = require('./ActivityLog');
const { Counter } = require('../utils/counter');

module.exports = {
  User,
  Order,
  Inventory,
  GatePass,
  MillHourlyReport,
  MillDailySummary,
  StoreIssuance,
  ActivityLog,
  Counter
};
