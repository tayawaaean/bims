const Resident = require('../models/Resident');
const Household = require('../models/Household');

const updateHouseholdSummary = async (householdId) => {
  if (!householdId) return;

  const residents = await Resident.find({ household: householdId });

  // Total members
  const totalMembers = residents.length;

  // Find head
  const head = residents.find(res => res.relationshipToHead === 'Head');

  // Monthly income
  const incomes = residents
    .map(res => parseFloat(res.monthlyIncome) || 0)
    .filter(val => val >= 0);

  const totalIncome = incomes.reduce((acc, val) => acc + val, 0);
  const averageIncome = incomes.length > 0 ? totalIncome / incomes.length : 0;

  // is4PsBeneficiary — true if ANY member is a 4Ps beneficiary
  const is4PsBeneficiary = residents.some(res => res.is4PsBeneficiary === true);

  // Optional tag checks
  const isPWD = residents.some(res => res.isPWD);
  const isSenior = residents.some(res => res.isSeniorCitizen);
  const isSoloParent = residents.some(res => res.isSoloParent);

  // Update household
  await Household.findByIdAndUpdate(householdId, {
    totalMembers,
    head: head ? head._id : null,
    monthlyIncome: averageIncome,
    has4PsBeneficiary: is4PsBeneficiary,
    hasPWD: isPWD,
    hasSeniorCitizen: isSenior,
    hasSoloParent: isSoloParent
  });
};

module.exports = updateHouseholdSummary;
