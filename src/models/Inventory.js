const mongoose = require('mongoose');

// Dimension subdocument schema
const dimensionSchema = new mongoose.Schema({
  dimension: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  bundles: {
    type: Number,
    min: 0,
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    trim: true
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
  minimumStock: {
    type: Number,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    min: 0
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

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['finished_product', 'raw_material', 'store_item'],
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
  // For finished products - use dimensions array
  dimensions: [dimensionSchema],
  
  // For raw materials and store items - use simple quantity fields
  quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  bundles: {
    type: Number,
    min: 0,
    default: 0
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
  minimumStock: {
    type: Number,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    min: 0
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
  }],
  
  length: {
    type: Number,
    trim: true,
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
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save middleware to auto-generate base SKU if not provided
inventorySchema.pre('save', async function() {
  if (!this.sku) {
    // Generate base SKU from name and type
    const nameSlug = this.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8);
    const typePrefix = this.type.toUpperCase().substring(0, 3);
    
    // Find the next available number for this pattern
    let counter = 1;
    let baseSku;
    let existingItem;
    
    do {
      baseSku = `${typePrefix}-${nameSlug}-${counter.toString().padStart(3, '0')}`;
      existingItem = await this.constructor.findOne({ sku: baseSku });
      counter++;
    } while (existingItem && counter < 1000);
    
    this.sku = baseSku;
  }
});

// Pre-save middleware to calculate available quantity
inventorySchema.pre('save', function() {
  if (this.type === 'finished_product') {
    // For finished products - use dimensions
    let hasStock = false;
    let hasLowStock = false;
    let hasBlockedOrders = false;

    this.dimensions.forEach(dimension => {
      dimension.availableQuantity = Math.max(0, dimension.quantity - dimension.reservedQuantity);
      
      if (dimension.availableQuantity > 0) {
        hasStock = true;
      }
      
      if (dimension.quantity <= dimension.minimumStock && dimension.quantity > 0) {
        hasLowStock = true;
      }
      
      if (dimension.blockedOrders && dimension.blockedOrders.length > 0) {
        hasBlockedOrders = true;
      }
    });

    // Update overall status based on all dimensions
    if (!hasStock) {
      this.status = 'out_of_stock';
    } else if (hasBlockedOrders) {
      this.status = 'blocked';
    } else if (hasLowStock) {
      this.status = 'low_stock';
    } else {
      this.status = 'available';
    }
  } else {
    // For raw materials and store items - use simple quantity
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
  }
});

// Pre-save middleware to auto-generate SKUs for dimensions
inventorySchema.pre('save', function() {
  this.dimensions.forEach(dimension => {
    if (!dimension.sku) {
      // Auto-generate SKU format: {baseSKU}-{dimension}
      const dimensionSlug = dimension.dimension.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      dimension.sku = `${this.sku}-${dimensionSlug}`;
    }
  });
});

// Instance method to reserve quantity for a specific dimension
inventorySchema.methods.reserveQuantityForDimension = function(dimensionId, quantity) {
  const dimension = this.dimensions.id(dimensionId);
  if (!dimension) return false;
  
  if (dimension.availableQuantity >= quantity) {
    dimension.reservedQuantity += quantity;
    dimension.availableQuantity = dimension.quantity - dimension.reservedQuantity;
    return true;
  }
  return false;
};

// Instance method to release reserved quantity for a specific dimension
inventorySchema.methods.releaseReservedQuantityForDimension = function(dimensionId, quantity) {
  const dimension = this.dimensions.id(dimensionId);
  if (!dimension) return false;
  
  dimension.reservedQuantity = Math.max(0, dimension.reservedQuantity - quantity);
  dimension.availableQuantity = dimension.quantity - dimension.reservedQuantity;
  return true;
};

// Instance method to consume inventory for a specific dimension
inventorySchema.methods.consumeInventoryForDimension = function(dimensionId, quantity) {
  const dimension = this.dimensions.id(dimensionId);
  if (!dimension) return false;
  
  if (dimension.quantity >= quantity) {
    dimension.quantity -= quantity;
    dimension.reservedQuantity = Math.max(0, dimension.reservedQuantity - quantity);
    dimension.availableQuantity = dimension.quantity - dimension.reservedQuantity;
    return true;
  }
  return false;
};

// Instance method to add a new dimension
inventorySchema.methods.addDimension = function(dimensionData) {
  const newDimension = {
    dimension: dimensionData.dimension,
    quantity: dimensionData.quantity || 0,
    bundles: dimensionData.bundles || 0,
    minimumStock: dimensionData.minimumStock || 0,
    maxStock: dimensionData.maxStock,
    // SKU will be auto-generated in pre-save middleware
  };
  
  this.dimensions.push(newDimension);
  return this.dimensions[this.dimensions.length - 1];
};

// Static method to find available inventory for a product with specific dimension
inventorySchema.statics.findAvailableStock = function(name, dimension, type = 'finished_product') {
  return this.findOne({
    name,
    type,
    status: { $in: ['available', 'low_stock'] },
    'dimensions.dimension': dimension,
    'dimensions.availableQuantity': { $gt: 0 }
  });
};

// Static method to find inventory item by dimension SKU
inventorySchema.statics.findByDimensionSku = function(dimensionSku) {
  return this.findOne({
    'dimensions.sku': dimensionSku
  });
};

// Index for better query performance
inventorySchema.index({ sku: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ name: 1 });
inventorySchema.index({ type: 1, status: 1 });
inventorySchema.index({ name: 1, type: 1 });
inventorySchema.index({ 'dimensions.sku': 1 });
inventorySchema.index({ 'dimensions.dimension': 1 });
inventorySchema.index({ 'dimensions.availableQuantity': 1 });
inventorySchema.index({ 'dimensions.blockedOrders.orderId': 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
