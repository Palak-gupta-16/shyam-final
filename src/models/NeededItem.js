const mongoose = require('mongoose');

const neededItemSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  dimensions: {
    type: String,
    trim: true
  },
  quantityNeeded: {
    type: Number,
    required: true,
    min: 1
  },
  bundlesNeeded: {
    type: Number,
    min: 0,
    default: 0
  },
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  dimensionId: {
    type: mongoose.Schema.Types.ObjectId
  },
  orderReference: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    orderNumber: {
      type: Number,
      required: true
    },
    customerOrSupplier: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'partially_fulfilled', 'fulfilled'],
    default: 'pending'
  },
  quantityFulfilled: {
    type: Number,
    min: 0,
    default: 0
  },
  bundlesFulfilled: {
    type: Number,
    min: 0,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fulfilledAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to update status based on fulfillment
neededItemSchema.pre('save', function() {
  if (this.quantityFulfilled >= this.quantityNeeded) {
    this.status = 'fulfilled';
    if (!this.fulfilledAt) {
      this.fulfilledAt = new Date();
    }
  } else if (this.quantityFulfilled > 0) {
    this.status = 'partially_fulfilled';
  } else {
    this.status = 'pending';
  }
});

// Instance method to check if item can be fulfilled with available inventory
neededItemSchema.methods.checkFulfillmentPossibility = async function() {
  const Inventory = mongoose.model('Inventory');
  
  const inventoryItem = await Inventory.findById(this.inventoryItemId);
  if (!inventoryItem) return { canFulfill: false, reason: 'Inventory item not found' };

  if (inventoryItem.type === 'finished_product') {
    const dimension = inventoryItem.dimensions.id(this.dimensionId);
    if (!dimension) return { canFulfill: false, reason: 'Dimension not found' };
    
    const availableQuantity = dimension.availableQuantity;
    const neededQuantity = this.quantityNeeded - this.quantityFulfilled;
    
    return {
      canFulfill: availableQuantity >= neededQuantity,
      availableQuantity,
      neededQuantity,
      reason: availableQuantity < neededQuantity ? 'Insufficient stock' : null
    };
  } else {
    const availableQuantity = inventoryItem.availableQuantity;
    const neededQuantity = this.quantityNeeded - this.quantityFulfilled;
    
    return {
      canFulfill: availableQuantity >= neededQuantity,
      availableQuantity,
      neededQuantity,
      reason: availableQuantity < neededQuantity ? 'Insufficient stock' : null
    };
  }
};

// Static method to find items that can be fulfilled
neededItemSchema.statics.findFulfillableItems = async function() {
  const items = await this.find({ status: { $in: ['pending', 'partially_fulfilled'] } })
    .populate('inventoryItemId')
    .populate('orderReference.orderId', 'orderNumber status type')
    .populate('createdBy', 'name alias')
    .sort({ priority: -1, createdAt: 1 });

  const fulfillableItems = [];
  
  for (const item of items) {
    const fulfillmentCheck = await item.checkFulfillmentPossibility();
    if (fulfillmentCheck.canFulfill) {
      fulfillableItems.push({
        ...item.toObject(),
        fulfillmentCheck
      });
    }
  }
  
  return fulfillableItems;
};

// Static method to auto-detect needed items from orders
neededItemSchema.statics.detectNeededItemsFromOrder = async function(order) {
  const Inventory = mongoose.model('Inventory');
  const neededItems = [];

  for (const product of order.products) {
    if (!product.inventoryItemId) continue;

    const inventoryItem = await Inventory.findById(product.inventoryItemId);
    if (!inventoryItem) continue;

    let availableQuantity = 0;
    let dimensionId = null;

    if (inventoryItem.type === 'finished_product' && product.dimensionId) {
      const dimension = inventoryItem.dimensions.id(product.dimensionId);
      if (dimension) {
        availableQuantity = dimension.availableQuantity;
        dimensionId = dimension._id;
      }
    } else {
      availableQuantity = inventoryItem.availableQuantity;
    }

    const shortfall = product.quantity - availableQuantity;
    if (shortfall > 0) {
      // Check if needed item already exists for this order and product
      const existingNeededItem = await this.findOne({
        'orderReference.orderId': order._id,
        inventoryItemId: product.inventoryItemId,
        dimensionId: dimensionId,
        status: { $in: ['pending', 'partially_fulfilled'] }
      });

      if (!existingNeededItem) {
        neededItems.push({
          productName: product.name,
          dimensions: product.dimensions,
          quantityNeeded: shortfall,
          bundlesNeeded: Math.ceil(shortfall / (inventoryItem.bundleSize || 1)),
          inventoryItemId: product.inventoryItemId,
          dimensionId: dimensionId,
          orderReference: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customerOrSupplier: order.customerOrSupplier
          },
          priority: order.priority || 'medium',
          createdBy: order.createdBy
        });
      }
    }
  }

  return neededItems;
};

// Index for better query performance
neededItemSchema.index({ status: 1 });
neededItemSchema.index({ 'orderReference.orderId': 1 });
neededItemSchema.index({ inventoryItemId: 1 });
neededItemSchema.index({ priority: 1, createdAt: 1 });
neededItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NeededItem', neededItemSchema);