const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();
const systemController = require('../controllers/systemController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

router.post('/backup', protect, adminOnly, systemController.backupDatabase);
router.get('/backup/download', protect, adminOnly, systemController.downloadBackup);
router.post('/restore', protect, adminOnly, upload.single('backup'), systemController.restoreDatabase);

module.exports = router;