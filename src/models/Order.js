const { required } = require('joi');
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    unique: true,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['dispatch', 'purchase']
  },
  status: {
    type: String,
    required: true,
    enum: [
      // Initial creation states
      'draft', // New state for orders created without vehicle info
      'pending_dispatch_approval', // New state for dispatch orders ready for vehicle info
      // Dispatch states
      'pending_guard_approval',
      'inside_factory_pending_empty_weight',
      'inside_factory_pending_loading',
      'inside_factory_pending_final_weight',
      'ready_for_billing',
      'ready_for_dispatch',
      // Purchase states
      'inside_factory_pending_empty_weight_purchase',
      'inside_factory_pending_unloading',
      'inside_factory_pending_final_weight_purchase',
      'ready_for_billing_purchase',
      'ready_for_exit_purchase',
      // Common states
      'completed'
    ]
  },
  customerOrSupplier: {
    type: String,
    required: true,
    trim: true
  },
  vehicle: {
    number: {
      type: String,
      trim: true
    },
    driverName: {
      type: String,
      trim: true
    },
    driverNumber: {
      type: String,
      trim: true
    }
  },
  products: [{
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    dimensionId: {
      type: mongoose.Schema.Types.ObjectId
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    dimensions: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    quantityFulfilled: {
      type: Number,
      min: 0,
      default: 0
    },
    quantityPending: {
      type: Number,
      min: 0,
      default: 0
    },
    unit: {
      type: String,
      default: 'pieces'
    }
  }],
  weights: {
    emptyWeight: {
      type: Number,
      min: 0
    },
    finalWeight: {
      type: Number,
      min: 0
    },
    slipUrl: {
      type: String,
      trim: true
    }
  },
  netWeight: {
    type: Number,
    min: 0
  },
  loadingDetails: {
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bundles: {
      type: Number,
      min: 0
    },
    totalLoadedWeight: {
      type: Number,
      min: 0
    },
    productLoads: [{
      productIndex: {
        type: Number,
        required: true
      },
      bundles: {
        type: Number,
        required: true,
        min: 0
      },
      weightPerBundle: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  },
  invoice: {
    billNumber: {
      type: Number,
      unique: true,
      sparse: true
    },
    amount: {
      type: Number,
      min: 0
    },
    pdfUrl: {
      type: String,
      trim: true
    },
    RatePerUnit:{
      type: Number,
      min: 0
    },
    TaxPercentage:{
      type: Number,
      min: 0
    },
    invoiceNotes: {
      type: String,
      trim: true
    },
    // Billing party details
    billingParty: {
      name: {
        type: String,
        trim: true
      },
      address: {
        type: String,
        trim: true
      },
      gstin: {
        type: String,
        trim: true
      },
      contact: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      pincode: {
        type: String,
        trim: true
      }
    },
    // Company details
    company: {
      name: {
        type: String,
        trim: true
      },
      address: {
        type: String,
        trim: true
      },
      gstin: {
        type: String,
        trim: true
      },
      contact: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  history: [{
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    from: {
      type: String
    },
    to: {
      type: String,
      required: true
    },
    note: {
      type: String,
      trim: true
    },
    at: {
      type: Date,
      default: Date.now
    }
  }],
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    trim: true
  },
  blockedAt: {
    type: Date
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  neededItems: [{
    productName: {
      type: String,
      required: true
    },
    dimensions: {
      type: String
    },
    quantityNeeded: {
      type: Number,
      required: true,
      min: 0
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  canDispatch: {
    type: Boolean,
    default: false
  },
  fulfilledAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Pre-save middleware to set pending quantities
orderSchema.pre('save', function() {
  if (this.isNew || this.isModified('products')) {
    this.products.forEach(product => {
      product.quantityPending = product.quantity - product.quantityFulfilled;
    });
  }
});

// Instance method to check if order is fully fulfilled
orderSchema.methods.isFullyFulfilled = function() {
  return this.products.every(product => product.quantityFulfilled >= product.quantity);
};

// Instance method to get unfulfilled products
orderSchema.methods.getUnfulfilledProducts = function() {
  return this.products.filter(product => product.quantityPending > 0);
};

// Static method to find blocked orders
orderSchema.statics.findBlockedOrders = function() {
  return this.find({ isBlocked: true }).populate('blockedBy', 'name alias').populate('createdBy', 'name alias');
};

// Index for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ type: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ isBlocked: 1 });
orderSchema.index({ 'products.inventoryItemId': 1 });

module.exports = mongoose.model('Order', orderSchema);
