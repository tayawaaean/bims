const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Pending', 'Under Investigation', 'Settled', 'Escalated', 'For Hearing', 'Closed'],
    required: true
  },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String }
}, { _id: false });

const blotterSchema = new mongoose.Schema({
  complainant: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
  respondent: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
  complainantName: {
    type: String,
    required: function() { return !this.complainant; },
    trim: true
  },
  respondentName: {
    type: String,
    required: function() { return !this.respondent; },
    trim: true
  },
  incidentDate: { type: Date, required: true },
  incidentTime: { type: String },
  location: { type: String, trim: true },
  natureOfComplaint: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  actionTaken: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Under Investigation', 'Settled', 'Escalated', 'For Hearing', 'Closed'],
    default: 'Pending'
  },
  remarks: { type: String, trim: true },
  attachments: [{ type: String }], // File paths
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  statusHistory: [statusHistorySchema], // Workflow history
  caseHandler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Assignment
  isPublic: { type: Boolean, default: false } // For public/anonymous submission
}, { timestamps: true });

module.exports = mongoose.model('Blotter', blotterSchema);