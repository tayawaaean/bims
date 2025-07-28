const mongoose = require('mongoose');

const officialSchema = new mongoose.Schema({
  name: String,
  position: String,
  termStart: Date,
  termEnd: Date,
  photo: String
});

const barangayProfileSchema = new mongoose.Schema({
  barangayName: { type: String, required: true },
  logo: String, // Path to image
  vision: String,
  mission: String,
  address: String,
  contactNumber: String,
  email: String,
  officials: [officialSchema],
  systemSettings: {
    autoIdFormat: String,
    pdfHeader: String,
    backupEnabled: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('BarangayProfile', barangayProfileSchema);