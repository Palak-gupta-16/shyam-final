const mongoose = require('mongoose');

const storeIssuanceSchema = new mongoose.Schema({
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issuedTo: {
    type: String,
    required: true,
    trim: true
  },
  item: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'pieces'
    },
    description: {
      type: String,
      trim: true
    }
  },
  dateIssued: {
    type: Date,
    default: Date.now
  },
  purpose: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  employeeId: {
    type: String,
    trim: true
  },
  returnExpected: {
    type: Boolean,
    default: false
  },
  returnDate: {
    type: Date
  },
  returned: {
    type: Boolean,
    default: false
  },
  returnedQuantity: {
    type: Number,
    min: 0
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
storeIssuanceSchema.index({ issuedBy: 1 });
storeIssuanceSchema.index({ dateIssued: -1 });
storeIssuanceSchema.index({ issuedTo: 1 });
storeIssuanceSchema.index({ department: 1 });

module.exports = mongoose.model('StoreIssuance', storeIssuanceSchema);
