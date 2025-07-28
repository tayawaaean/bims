const BarangayProfile = require('../models/BarangayProfile');
const path = require('path');

// GET
exports.getProfile = async (req, res) => {
  const profile = await BarangayProfile.findOne();
  if (!profile) return res.status(404).json({ message: "Profile not set." });
  res.json(profile);
};

// PUT (Admin only)
exports.updateProfile = async (req, res) => {
  let profile = await BarangayProfile.findOne();
  if (!profile) profile = new BarangayProfile({});
  Object.assign(profile, req.body);
  await profile.save();
  res.json({ message: "Profile updated.", profile });
};

// POST logo
exports.uploadLogo = async (req, res) => {
  const filePath = path.join('/uploads/logos/', req.file.filename);
  let profile = await BarangayProfile.findOne();
  if (!profile) profile = new BarangayProfile({});
  profile.logo = filePath;
  await profile.save();
  res.json({ message: "Logo uploaded.", logo: filePath });
};