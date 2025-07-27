const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  // 📌 Identification
  householdCode: { type: String, required: true, unique: true },
  purok: { type: String, required: true },
  address: { type: String },

  // 👨‍👩‍👧 Members & Head
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
  totalMembers: { type: Number, default: 0 },

  // 💰 Derived Info
  monthlyIncome: { type: Number, default: 0 }, // total of members' income
  has4PsBeneficiary: { type: Boolean, default: false }, // if any member is in 4Ps

  // 🏷️ Optional tags (future expansion: e.g. "low-income", "needs-survey", etc.)
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Household', householdSchema);
