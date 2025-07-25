const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const {
  changePassword,
  updateProfile,
  getMyProfile
} = require('../controllers/userController');

// 👤 Get current user profile
router.get('/me', protect, getMyProfile);

// ✏️ Update profile (name, username, avatar)
router.patch('/update-profile', protect, upload.single('avatar'), updateProfile);

// 🔒 Change password
router.patch('/change-password', protect, changePassword);

module.exports = router;
