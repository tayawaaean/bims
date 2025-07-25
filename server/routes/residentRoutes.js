const express = require('express');
const router = express.Router();
const {
  addResident,
  updateResident,
  deleteResident,
  getResidents,
  getResidentById,
  updateResidentAvatar,
  getResidentsByHousehold
} = require('../controllers/residentController');

const { protect, adminOnly } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadResidentAvatar');

// ➕ Add Resident (Admin only)
router.post('/', protect, adminOnly, upload.single('avatar'), addResident);

// 📝 Update Resident Info
router.put('/:id', protect, adminOnly, updateResident);

// 📷 Update Avatar Only
router.put('/:id/avatar', protect, adminOnly, upload.single('avatar'), updateResidentAvatar);

// ❌ Delete Resident
router.delete('/:id', protect, adminOnly, deleteResident);

// 📋 Get All Residents (with filters, pagination)
router.get('/', protect, adminOnly, getResidents);

// 🔍 Get Single Resident
router.get('/:id', protect, adminOnly, getResidentById);

// 👨‍👩‍👧 Get All Members of a Household
router.get('/household/:householdId', protect, adminOnly, getResidentsByHousehold);

module.exports = router;
