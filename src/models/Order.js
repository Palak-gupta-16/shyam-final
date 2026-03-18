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
      required: false,
      trim: true
    },
    driverName: {
      type: String,
      required: false,
      trim: true
    },
    driverNumber: {
      type: String,
      required: false,
      trim: true
    },
    addedAt: {
      type: Date
    }
  },
  products: [{
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
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
    length: {
      type: String,
      trim: true
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
    averageWeightPerBundle: {
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
        min: 1
      },
      totalWeight: {
        type: Number,
        min: 0
      },
      weightPerBundle: {
        type: Number,
        min: 0
      },
      bundleDetails: [{
        bundleNumber: {
          type: Number,
          min: 1
        },
        weight: {
          type: Number,
          required: true,
          min: 0
        },
        size: {
          type: String,
          trim: true
        },
        length: {
          type: Number,
          min: 0
        }
      }]
    }],
    notes: {
      type: String,
      trim: true
    }
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
      type:Number,
      min:0
    },
    TaxPercentage:{
      type:Number,
      min:0
    },
    fare: {
      amount: {
        type: Number,
        min: 0
      },
      paidBy: {
        type: String,
        enum: ['our_side', 'other_party'],
        trim: true
      },
      paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid'],
        trim: true
      },
      notes: {
        type: String,
        trim: true
      }
    },
    invoiceNotes: {
      type: String,
      trim: true
    },
    generatedAt: {
      type: Date
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
