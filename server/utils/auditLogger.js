const AuditLog = require('../models/Auditlog');

async function auditLog({ user, action, entity, entityId, details, ip }) {
  try {
    await AuditLog.create({
      user: user ? user._id : null,
      action,
      entity,
      entityId,
      details,
      ip
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = auditLog;