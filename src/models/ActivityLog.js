const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['Order', 'Inventory', 'GatePass', 'MillHourlyReport', 'MillDailySummary', 'StoreIssuance', 'User'],
    trim: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
activityLogSchema.index({ user: 1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1 });
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
