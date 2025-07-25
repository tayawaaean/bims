const Household = require('../models/Household');
const Resident = require('../models/Resident');

const updateHouseholdHead = async (householdId) => {
  if (!householdId) return;

  const heads = await Resident.find({
    household: householdId,
    relationshipToHead: 'Head'
  });

  let selectedHead = null;

  if (heads.length > 0) {
    selectedHead = heads[0]; // pick the first (or implement smarter logic)

    // Demote extra heads if any
    if (heads.length > 1) {
      for (let i = 1; i < heads.length; i++) {
        heads[i].relationshipToHead = 'Relative';
        await heads[i].save();
      }
    }
  }

  await Household.findByIdAndUpdate(householdId, {
    head: selectedHead ? selectedHead._id : null
  });
};

module.exports = updateHouseholdHead;
