const mongoose = require('mongoose');

const millHourlyReportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  // Final products produced
  finalProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    dimension: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  // Raw materials consumed
  rawMaterialsConsumed: [{
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    materialName: {
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
      default: 'kg'
    }
  }],
  // Waste products generated
  wasteProducts: [{
    wasteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    wasteName: {
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
      default: 'kg'
    }
  }],
  breakdowns: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shift: {
    type: String,
    enum: ['A', 'B', 'C'],
    trim: true
  },
  operatorName: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one report per date-hour combination
millHourlyReportSchema.index({ date: 1, hour: 1 });
millHourlyReportSchema.index({ createdBy: 1 });
millHourlyReportSchema.index({ date: -1 });

module.exports = mongoose.model('MillHourlyReport', millHourlyReportSchema);
