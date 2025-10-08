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
  billetSize: {
    type: String,
    required: true,
    trim: true
  },
  piecesProduced: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  missRolls: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
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
millHourlyReportSchema.index({ date: 1, hour: 1 }, { unique: true });
millHourlyReportSchema.index({ createdBy: 1 });
millHourlyReportSchema.index({ date: -1 });

module.exports = mongoose.model('MillHourlyReport', millHourlyReportSchema);
