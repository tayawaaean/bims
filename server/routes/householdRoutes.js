const express = require('express');
const router = express.Router();
const {
  addHousehold,
  updateHousehold,
  deleteHousehold,
  getHouseholds,
  getHouseholdById,
  getHouseholdMembers,
  recalculateTotalMembers
} = require('../controllers/householdController');

const { protect, adminOnly } = require('../middlewares/authMiddleware');

// ➕ Add Household
router.post('/', protect, adminOnly, addHousehold);

// ✏️ Update
router.put('/:id', protect, adminOnly, updateHousehold);

// ❌ Delete
router.delete('/:id', protect, adminOnly, deleteHousehold);

// 📋 Get All
router.get('/', protect, adminOnly, getHouseholds);

// 🔍 Get One
router.get('/:id', protect, adminOnly, getHouseholdById);

// 👨‍👩‍👧 Get Members
router.get('/:householdId/members', protect, adminOnly, getHouseholdMembers);

// 🔁 Recalculate Members
router.put('/:id/recalculate', protect, adminOnly, recalculateTotalMembers);

module.exports = router;
