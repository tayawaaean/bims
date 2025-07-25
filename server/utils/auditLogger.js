const Log = require('../models/Log');

const auditLog = async (userId, action, details = '') => {
  try {
    await Log.create({ userId, action, details });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = auditLog;
