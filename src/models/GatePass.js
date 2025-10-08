const mongoose = require('mongoose');

const gatePassSchema = new mongoose.Schema({
  requestBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    number: {
      type: String,
      required: true,
      trim: true
    },
    driverName: {
      type: String,
      required: true,
      trim: true
    }
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  validUntil: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
gatePassSchema.index({ status: 1 });
gatePassSchema.index({ requestBy: 1 });
gatePassSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GatePass', gatePassSchema);
