const express = require('express');
const router = express.Router();
const { updateApprovalStatus } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// ✅ Protect route + restrict to admin only
router.patch('/approval', protect, adminOnly, updateApprovalStatus);

module.exports = router;
