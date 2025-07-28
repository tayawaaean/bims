const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Trigger backup
exports.backupDatabase = (req, res) => {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const filename = `backup-${Date.now()}.gz`;
  const backupPath = path.join(backupDir, filename);
  const cmd = `mongodump --archive=${backupPath} --gzip`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ message: 'Backup failed', error: stderr });
    res.json({ message: 'Backup completed', file: filename });
  });
};

// Download backup file
exports.downloadBackup = (req, res) => {
  const file = req.query.file;
  const filePath = path.join(__dirname, '../backups', file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
  res.download(filePath);
};

// Restore from uploaded backup file
exports.restoreDatabase = (req, res) => {
  const filePath = req.file.path;
  const cmd = `mongorestore --drop --archive=${filePath} --gzip`;
  exec(cmd, (error, stdout, stderr) => {
    fs.unlinkSync(filePath); // remove uploaded file after restore
    if (error) return res.status(500).json({ message: 'Restore failed', error: stderr });
    res.json({ message: 'Restore completed' });
  });
};