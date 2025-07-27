const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true
  },
  type: {
    type: String,
    enum: [
      'Barangay Clearance',
      'Certificate of Residency',
      'Certificate of Indigency',
      'Certificate of Good Moral',
      'Barangay ID',
      'Barangay Business Permit'
    ],
    required: true
  },
  purpose: { type: String, trim: true }, // e.g., "For employment"
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Claimed', 'Rejected'],
    default: 'Pending'
  },
  remarks: { type: String },

  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  issuedAt: { type: Date },

  qrCode: { type: String }, // For scanning/verification
  filePath: { type: String }, // Optional if you store PDF path

}, {
  timestamps: true
});

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
