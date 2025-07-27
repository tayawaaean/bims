const Resident = require('../models/Resident');
const Household = require('../models/Household');

const updateHouseholdMembers = async (householdId) => {
  if (!householdId) return;

  const members = await Resident.find({ household: householdId });

  const totalMembers = members.length;
  const totalIncome = members.reduce((sum, r) => sum + (r.monthlyIncome || 0), 0);
  const has4Ps = members.some(member => member.is4PsBeneficiary);

  await Household.findByIdAndUpdate(householdId, {
    totalMembers,
    monthlyIncome: totalIncome,
    has4PsBeneficiary: has4Ps
  });
};

module.exports = updateHouseholdMembers;
