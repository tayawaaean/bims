const Resident = require('../models/Resident');
const Household = require('../models/Household');
const logger = require('../utils/logger');
const updateHouseholdMembers = require('../utils/updateHouseholdMembers');
const updateHouseholdHead = require('../utils/updateHouseholdHead');
const updateHouseholdSummary = require('../utils/updateHouseholdSummary'); // ✅ Add this

// 🔒 Ensure only one 'Head' per household
const ensureSingleHouseholdHead = async (householdId, excludeId = null) => {
  const existingHead = await Resident.findOne({
    household: householdId,
    relationshipToHead: 'Head',
    _id: { $ne: excludeId }
  });

  if (existingHead) {
    existingHead.relationshipToHead = 'Relative';
    await existingHead.save();
  }
};

// ➕ Add New Resident
exports.addResident = async (req, res) => {
  try {
    const { body, file } = req;

    // 🔍 Validate household if provided
    if (body.household) {
      const householdExists = await Household.findById(body.household);
      if (!householdExists) {
        return res.status(400).json({ message: 'Invalid household reference' });
      }

      if (body.relationshipToHead === 'Head') {
        await ensureSingleHouseholdHead(body.household);
      }
    }

    const newResident = new Resident({
      ...body,
      avatar: file ? `/uploads/residents/${file.filename}` : '',
      registeredBy: req.user?._id
    });

    await newResident.save();
    await updateHouseholdMembers(newResident.household);
    await updateHouseholdHead(newResident.household);
    await updateHouseholdSummary(newResident.household); // ✅ Update summary

    logger.info(`👤 Resident added: ${newResident.firstName} ${newResident.lastName}`);
    res.status(201).json({ message: 'Resident added successfully', resident: newResident });

  } catch (err) {
    logger.error(`❌ Failed to add resident: ${err.message}`);
    res.status(500).json({ message: 'Server error adding resident' });
  }
};

// 📝 Update Resident
exports.updateResident = async (req, res) => {
  try {
    const { body } = req;
    const residentId = req.params.id;

    const existing = await Resident.findById(residentId);
    if (!existing) return res.status(404).json({ message: 'Resident not found' });

    const oldHousehold = existing.household?.toString();
    const newHousehold = body.household || oldHousehold;

    if (body.relationshipToHead === 'Head') {
      await ensureSingleHouseholdHead(newHousehold, residentId);
    }

    const updated = await Resident.findByIdAndUpdate(residentId, body, { new: true });

    if (newHousehold !== oldHousehold) {
      await updateHouseholdMembers(oldHousehold);
      await updateHouseholdHead(oldHousehold);
      await updateHouseholdSummary(oldHousehold); // ✅ Update old household summary
    }

    await updateHouseholdMembers(newHousehold);
    await updateHouseholdHead(newHousehold);
    await updateHouseholdSummary(newHousehold); // ✅ Update new household summary

    logger.info(`✏️ Resident updated: ${updated.firstName} ${updated.lastName}`);
    res.status(200).json({ message: 'Resident updated successfully', resident: updated });

  } catch (err) {
    logger.error(`❌ Failed to update resident: ${err.message}`);
    res.status(500).json({ message: 'Server error updating resident' });
  }
};

// 🖼 Update Avatar
exports.updateResidentAvatar = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident) return res.status(404).json({ message: 'Resident not found' });

    resident.avatar = `/uploads/residents/${req.file.filename}`;
    await resident.save();

    logger.info(`🖼 Avatar updated for: ${resident.firstName} ${resident.lastName}`);
    res.status(200).json({ message: 'Avatar updated successfully', avatar: resident.avatar });

  } catch (err) {
    logger.error(`❌ Failed to update avatar: ${err.message}`);
    res.status(500).json({ message: 'Server error updating avatar' });
  }
};

// ❌ Delete Resident
exports.deleteResident = async (req, res) => {
  try {
    const deleted = await Resident.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Resident not found' });

    await updateHouseholdMembers(deleted.household);
    await updateHouseholdHead(deleted.household);
    await updateHouseholdSummary(deleted.household); // ✅ Update summary after delete

    logger.info(`🗑 Resident deleted: ${deleted.firstName} ${deleted.lastName}`);
    res.status(200).json({ message: 'Resident deleted successfully' });

  } catch (err) {
    logger.error(`❌ Failed to delete resident: ${err.message}`);
    res.status(500).json({ message: 'Server error deleting resident' });
  }
};

// 📋 Get All Residents (with filters & pagination)
exports.getResidents = async (req, res) => {
  try {
    const {
      search,
      gender,
      status,
      purok,
      employmentStatus,
      isVoter,
      is4PsBeneficiary,
      tags,
      minIncome,
      maxIncome,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } }
      ];
    }

    if (gender) query.gender = gender;
    if (status) query.status = status;
    if (purok) query.purok = purok;
    if (employmentStatus) query.employmentStatus = employmentStatus;
    if (isVoter !== undefined) query.isVoter = isVoter === 'true';
    if (is4PsBeneficiary !== undefined) query.is4PsBeneficiary = is4PsBeneficiary === 'true';

    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      if (tagsArray.includes('PWD')) query.isPWD = true;
      if (tagsArray.includes('SeniorCitizen')) query.isSeniorCitizen = true;
      if (tagsArray.includes('SoloParent')) query.isSoloParent = true;
    }

    if (minIncome || maxIncome) {
      query.monthlyIncome = {};
      if (minIncome) query.monthlyIncome.$gte = parseFloat(minIncome);
      if (maxIncome) query.monthlyIncome.$lte = parseFloat(maxIncome);
    }

    const skip = (page - 1) * limit;
    const total = await Resident.countDocuments(query);
    const residents = await Resident.find(query)
      .populate('household', 'householdCode purok')
      .sort({ lastName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      residents,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    logger.error(`❌ Failed to fetch residents: ${err.message}`);
    res.status(500).json({ message: 'Server error fetching residents' });
  }
};

// 🔍 Get Single Resident
exports.getResidentById = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id)
      .populate('household', 'householdCode purok');

    if (!resident) return res.status(404).json({ message: 'Resident not found' });

    res.status(200).json(resident);

  } catch (err) {
    logger.error(`❌ Failed to fetch resident: ${err.message}`);
    res.status(500).json({ message: 'Server error fetching resident' });
  }
};

// 👨‍👩‍👧 Get All Members of a Household
exports.getResidentsByHousehold = async (req, res) => {
  try {
    const { householdId } = req.params;

    const residents = await Resident.find({ household: householdId })
      .sort({ lastName: 1 });

    res.status(200).json({ householdId, residents });

  } catch (err) {
    logger.error(`❌ Failed to fetch household members: ${err.message}`);
    res.status(500).json({ message: 'Server error fetching household members' });
  }
};
