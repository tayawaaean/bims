const BarangayProfile = require('../models/BarangayProfile');
const path = require('path');
const auditLog = require('../utils/auditLogger'); // <-- Add this line

// GET
exports.getProfile = async (req, res) => {
  try {
    const profile = await BarangayProfile.findOne();
    if (!profile) return res.status(404).json({ message: "Profile not set." });

    // Optional: log read access (if desired)
    // await auditLog(req.user?._id, 'Get Barangay Profile', 'Viewed barangay profile');

    res.json(profile);
  } catch (err) {
    await auditLog(req.user?._id, 'Get Barangay Profile Failed', `Error: ${err.message}`);
    res.status(500).json({ message: "Error retrieving profile." });
  }
};

// PUT (Admin only)
exports.updateProfile = async (req, res) => {
  try {
    let profile = await BarangayProfile.findOne();
    const before = profile ? JSON.stringify(profile) : '{}';
    if (!profile) profile = new BarangayProfile({});
    Object.assign(profile, req.body);
    await profile.save();

    await auditLog(
      req.user?._id,
      'Update Barangay Profile',
      `Before: ${before}\nAfter: ${JSON.stringify(profile)}`
    );

    res.json({ message: "Profile updated.", profile });
  } catch (err) {
    await auditLog(req.user?._id, 'Update Barangay Profile Failed', `Error: ${err.message}`);
    res.status(500).json({ message: "Error updating profile." });
  }
};

// POST logo
exports.uploadLogo = async (req, res) => {
  try {
    const filePath = path.join('/uploads/logos/', req.file.filename);
    let profile = await BarangayProfile.findOne();
    const before = profile ? JSON.stringify(profile) : '{}';
    if (!profile) profile = new BarangayProfile({});
    profile.logo = filePath;
    await profile.save();

    await auditLog(
      req.user?._id,
      'Upload Barangay Logo',
      `Before: ${before}\nAfter: ${JSON.stringify(profile)}`
    );

    res.json({ message: "Logo uploaded.", logo: filePath });
  } catch (err) {
    await auditLog(req.user?._id, 'Upload Barangay Logo Failed', `Error: ${err.message}`);
    res.status(500).json({ message: "Error uploading logo." });
  }
};