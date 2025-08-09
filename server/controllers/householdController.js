const Household = require('../models/Household');
const Resident = require('../models/Resident');
const logger = require('../utils/logger');
const updateHouseholdSummary = require('../utils/updateHouseholdSummary');
const auditLog = require('../utils/auditLogger'); // <-- Add this

// ➕ Add Household
exports.addHousehold = async (req, res) => {
  try {
    const { householdCode, purok, head, address } = req.body;

    const existing = await Household.findOne({ householdCode });
    if (existing) {
      await auditLog(req.user?._id, 'Add Household Failed', `Household code already exists: ${householdCode}`);
      return res.status(400).json({ message: 'Household code already exists.' });
    }

    const newHousehold = new Household({
      householdCode,
      purok,
      head,
      address
    });

    await newHousehold.save();

    logger.info(`🏠 Household created: ${householdCode}`);
    await auditLog(
      req.user?._id,
      'Add Household',
      `Created household: ${householdCode} (ID: ${newHousehold._id})`
    );

    res.status(201).json({ message: 'Household created successfully', household: newHousehold });

  } catch (err) {
    logger.error(`❌ Error creating household: ${err.message}`);
    await auditLog(req.user?._id, 'Add Household Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✏️ Update Household Info
exports.updateHousehold = async (req, res) => {
  try {
    const before = await Household.findById(req.params.id);

    const updated = await Household.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updated) {
      await auditLog(req.user?._id, 'Update Household Failed', `Household not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Household not found' });
    }

    // ✅ Update derived fields
    await updateHouseholdSummary(updated._id);

    logger.info(`✏️ Household updated: ${updated.householdCode}`);
    await auditLog(
      req.user?._id,
      'Update Household',
      `Household ID: ${req.params.id}\nBefore: ${JSON.stringify(before)}\nAfter: ${JSON.stringify(updated)}`
    );

    res.status(200).json({ message: 'Household updated', household: updated });

  } catch (err) {
    logger.error(`❌ Error updating household: ${err.message}`);
    await auditLog(req.user?._id, 'Update Household Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ❌ Delete Household
exports.deleteHousehold = async (req, res) => {
  try {
    const deleted = await Household.findByIdAndDelete(req.params.id);
    if (!deleted) {
      await auditLog(req.user?._id, 'Delete Household Failed', `Household not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Household not found' });
    }

    logger.info(`🗑 Household deleted: ${deleted.householdCode}`);
    await auditLog(
      req.user?._id,
      'Delete Household',
      `Deleted household: ${deleted.householdCode} (ID: ${deleted._id})`
    );

    res.status(200).json({ message: 'Household deleted' });

  } catch (err) {
    logger.error(`❌ Error deleting household: ${err.message}`);
    await auditLog(req.user?._id, 'Delete Household Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📋 Get All Households (with search & pagination)
exports.getHouseholds = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      $or: [
        { householdCode: { $regex: search, $options: 'i' } },
        { purok: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ]
    };

    const total = await Household.countDocuments(query);
    const households = await Household.find(query)
      .populate('head', 'firstName lastName')
      .sort({ householdCode: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      households,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    logger.error(`❌ Failed to fetch households: ${err.message}`);
    await auditLog(req.user?._id, 'Fetch Households Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔍 Get Single Household
exports.getHouseholdById = async (req, res) => {
  try {
    const household = await Household.findById(req.params.id).populate('head');
    if (!household) {
      await auditLog(req.user?._id, 'Get Household Failed', `Household not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Household not found' });
    }

    res.status(200).json(household);
  } catch (err) {
    logger.error(`❌ Failed to get household: ${err.message}`);
    await auditLog(req.user?._id, 'Get Household Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 👨‍👩‍👧 Get Members of a Household
exports.getHouseholdMembers = async (req, res) => {
  try {
    const { householdId } = req.params;

    const members = await Resident.find({ household: householdId });

    // ✅ Ensure summary is accurate
    await updateHouseholdSummary(householdId);

    res.status(200).json({
      members,
      count: members.length
    });
  } catch (err) {
    logger.error(`❌ Failed to get household members: ${err.message}`);
    await auditLog(req.user?._id, 'Get Household Members Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔁 Recalculate Total Members + Summary
exports.recalculateTotalMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const household = await Household.findById(id);
    if (!household) {
      await auditLog(req.user?._id, 'Recalculate Household Summary Failed', `Household not found: ${id}`);
      return res.status(404).json({ message: 'Household not found' });
    }

    // ✅ Full summary update (members, income, 4Ps)
    await updateHouseholdSummary(id);

    const updated = await Household.findById(id);

    logger.info(`🔄 Recalculated summary for ${updated.householdCode}`);
    await auditLog(
      req.user?._id,
      'Recalculate Household Summary',
      `Recalculated summary for household: ${updated.householdCode} (ID: ${updated._id})`
    );

    res.status(200).json({
      message: 'Household summary updated',
      totalMembers: updated.totalMembers,
      monthlyIncome: updated.monthlyIncome,
      has4PsBeneficiary: updated.has4PsBeneficiary
    });

  } catch (err) {
    logger.error(`❌ Error recalculating household summary: ${err.message}`);
    await auditLog(req.user?._id, 'Recalculate Household Summary Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};