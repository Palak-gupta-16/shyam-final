const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['finished_product', 'raw_material', 'store_item', 'waste_material'],
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'needed', 'low_stock', 'out_of_stock', 'blocked'],
    default: 'available'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dimensions: {
    type: String,
    trim: true
  },
  length: {
    type: Number,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'pieces'
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  minimumStock: {
    type: Number,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  availableQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockedOrders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    quantityNeeded: {
      type: Number,
      min: 0
    },
    dateBlocked: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Pre-save middleware to calculate available quantity
inventorySchema.pre('save', function() {
  this.availableQuantity = Math.max(0, this.quantity - this.reservedQuantity);
  
  // Update status based on quantity
  if (this.quantity <= 0) {
    this.status = 'out_of_stock';
  } else if (this.quantity <= this.minimumStock) {
    this.status = 'low_stock';
  } else if (this.blockedOrders && this.blockedOrders.length > 0) {
    this.status = 'blocked';
  } else {
    this.status = 'available';
  }
});

// Instance method to reserve quantity
inventorySchema.methods.reserveQuantity = function(quantity) {
  if (this.availableQuantity >= quantity) {
    this.reservedQuantity += quantity;
    this.availableQuantity = this.quantity - this.reservedQuantity;
    return true;
  }
  return false;
};

// Instance method to release reserved quantity
inventorySchema.methods.releaseReservedQuantity = function(quantity) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  this.availableQuantity = this.quantity - this.reservedQuantity;
};

// Instance method to consume inventory (reduce actual quantity)
inventorySchema.methods.consumeInventory = function(quantity) {
  if (this.quantity >= quantity) {
    this.quantity -= quantity;
    this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
    this.availableQuantity = this.quantity - this.reservedQuantity;
    return true;
  }
  return false;
};

// Static method to find available inventory for a product
inventorySchema.statics.findAvailableStock = function(name, dimensions, type = 'finished_product') {
  return this.findOne({
    name,
    dimensions,
    type,
    status: { $in: ['available', 'low_stock'] },
    availableQuantity: { $gt: 0 }
  });
};

// Index for better query performance
inventorySchema.index({ sku: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ name: 1 });
inventorySchema.index({ type: 1, status: 1 });
inventorySchema.index({ name: 1, dimensions: 1, type: 1 });
inventorySchema.index({ availableQuantity: 1 });
inventorySchema.index({ 'blockedOrders.orderId': 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
