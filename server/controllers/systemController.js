const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const auditLog = require('../utils/auditLogger'); // <-- Add this

// Trigger backup
exports.backupDatabase = (req, res) => {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const filename = `backup-${Date.now()}.gz`;
  const backupPath = path.join(backupDir, filename);
  const cmd = `mongodump --archive=${backupPath} --gzip`;

  exec(cmd, async (error, stdout, stderr) => {
    if (error) {
      await auditLog(req.user?._id, 'Backup Database Failed', `Error: ${stderr}`);
      return res.status(500).json({ message: 'Backup failed', error: stderr });
    }
    await auditLog(req.user?._id, 'Backup Database', `Backup created: ${filename}`);
    res.json({ message: 'Backup completed', file: filename });
  });
};

// Download backup file
exports.downloadBackup = async (req, res) => {
  const file = req.query.file;
  const filePath = path.join(__dirname, '../backups', file);
  if (!fs.existsSync(filePath)) {
    await auditLog(req.user?._id, 'Download Backup Failed', `File not found: ${file}`);
    return res.status(404).json({ message: 'File not found' });
  }
  await auditLog(req.user?._id, 'Download Backup', `Downloaded backup: ${file}`);
  res.download(filePath);
};

// Restore from uploaded backup file
exports.restoreDatabase = (req, res) => {
  const filePath = req.file.path;
  const cmd = `mongorestore --drop --archive=${filePath} --gzip`;
  exec(cmd, async (error, stdout, stderr) => {
    fs.unlinkSync(filePath); // remove uploaded file after restore
    if (error) {
      await auditLog(req.user?._id, 'Restore Database Failed', `Error: ${stderr}`);
      return res.status(500).json({ message: 'Restore failed', error: stderr });
    }
    await auditLog(req.user?._id, 'Restore Database', `Database restored from ${req.file.originalname}`);
    res.json({ message: 'Restore completed' });
  });
};