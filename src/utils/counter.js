const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

const getNextSequence = async (name) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      name,
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    return counter.sequence_value;
  } catch (error) {
    console.error('Error generating sequence:', error);
    throw error;
  }
};

module.exports = { getNextSequence, Counter };
