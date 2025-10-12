const mongoose = require('mongoose');

const millDailySummarySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
 rawMaterials: [ // New field
    {
      inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
      },
      materialName: { type: String, required: true },
      quantityUsed: { type: Number, required: true, min: 0 }, // in KG or ton
      unit: { type: String, default: 'mt' }
    }
  ],
  finishedProduct: {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    dimensions: [{
      dimension: { type: String, required: true },
      bundles: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 0 }
    }]
  },
  wasteMaterials: [{
    materialName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'mt', trim: true }
  }],
  name: {
    type: String,
    required: true,
    trim: true
  },
  dimensions: {
    type: String,
    trim: true
  },
  totalPieces: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalWeight: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  breakdownSummary: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  productionHours: {
    type: Number,
    min: 0,
    max: 24,
    default: 0
  },
  efficiency: {
    type: Number,
    min: 0,
    max: 100
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
millDailySummarySchema.index({ date: -1 });
millDailySummarySchema.index({ createdBy: 1 });

module.exports = mongoose.model('MillDailySummary', millDailySummarySchema);
