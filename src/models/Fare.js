const mongoose = require('mongoose');

const fareSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    required: true,
    ref: 'Order'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  fareType: {
    type: String,
    required: true,
    enum: ['given_by_us', 'given_by_other_party']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  vehicleNumber: {
    type: String,
    required: true,
    trim: true
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  customerOrSupplier: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
fareSchema.index({ orderNumber: 1 });
fareSchema.index({ orderId: 1 });
fareSchema.index({ fareType: 1 });
fareSchema.index({ recordedAt: -1 });

// Ensure one fare record per order
fareSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Fare', fareSchema);