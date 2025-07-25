const Resident = require('../models/Resident');
const Household = require('../models/Household');

const updateHouseholdMembers = async (householdId) => {
  if (!householdId) return;
  const count = await Resident.countDocuments({ household: householdId });
  await Household.findByIdAndUpdate(householdId, { totalMembers: count });
};

module.exports = updateHouseholdMembers;
