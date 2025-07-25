const Resident = require('../models/Resident');

/**
 * Ensures only one "Head" exists in a household.
 * If a new head is being added/updated, demotes the old one.
 */
const ensureSingleHouseholdHead = async (householdId, currentResidentId) => {
  if (!householdId) return;

  const existingHead = await Resident.findOne({
    household: householdId,
    relationshipToHead: 'Head',
    _id: { $ne: currentResidentId } // exclude the current resident if updating
  });

  if (existingHead) {
    // Demote the old head
    existingHead.relationshipToHead = 'Relative'; // or 'Other'
    await existingHead.save();
  }
};

module.exports = ensureSingleHouseholdHead;
