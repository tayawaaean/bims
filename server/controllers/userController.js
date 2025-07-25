const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');
const auditLog = require('../utils/auditLogger');

// 🔒 Change Password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      logger.warn(`Failed password change attempt for ${user.email}`);
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    logger.info(`🔒 Password changed for ${user.email}`);
    await auditLog(user._id, 'Change Password', 'User successfully changed password');

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error(`Error changing password: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✏️ Update Profile Info (name, username, avatar)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, username, currentPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if new username is taken by someone else
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({ message: 'Username already in use' });
    }

    const avatar = req.file ? `/uploads/avatars/${req.file.filename}` : user.avatar;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, username, avatar },
      { new: true }
    );

    logger.info(`✏️ Profile updated for ${updatedUser.email}`);
    await auditLog(userId, 'Update Profile', `Updated name and/or username`);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar
      }
    });
  } catch (err) {
    logger.error(`Error updating profile: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔎 Get My Profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving profile' });
  }
};
