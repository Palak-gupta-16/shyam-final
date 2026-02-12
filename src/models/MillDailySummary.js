const mongoose = require('mongoose');

const millDailySummarySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  rawMaterials: [
    {
      inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
      },
      materialName: { type: String, required: true },
      quantityUsed: { type: Number, required: true, min: 0 },
      unit: { type: String, default: 'kg' }
    }
  ],
  finishedProduct: {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    quantityProduced: {
      type: Number,
      min: 0,
      default: 0
    },
    dimension: {
      type: String,
      trim: true
    }
  },
  wasteMaterials: [
    {
      inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
      },
      materialName: { type: String, required: true },
      quantityProduced: { type: Number, required: true, min: 0 },
      unit: { type: String, default: 'kg' }
    }
  ],
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
