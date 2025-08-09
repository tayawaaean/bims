const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  action: { type: String, required: true }, // e.g., "CREATE_RESIDENT"
  entity: { type: String, required: true }, // e.g., "Resident"
  entityId: { type: String, required: false }, // e.g., resident/document ID
  ip: { type: String },
  details: { type: Object }, // Fields changed, old/new value, etc.
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);