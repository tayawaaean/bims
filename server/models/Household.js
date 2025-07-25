const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  householdCode: { type: String, required: true, unique: true },
  purok: { type: String, required: true },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
  address: { type: String },
  totalMembers: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Household', householdSchema);
