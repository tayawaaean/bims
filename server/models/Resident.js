const mongoose = require('mongoose');
const Household = require('./Household');

const residentSchema = new mongoose.Schema({
  // 🧑 Personal Info
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  suffix: { type: String, trim: true },
  birthdate: { type: Date, required: true },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  civilStatus: {
    type: String,
    enum: ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'],
    required: true
  },
  nationality: { type: String, default: 'Filipino' },
  religion: { type: String },

  // 📚 Education
  educationalAttainment: {
    type: String,
    enum: ['None', 'Elementary', 'High School', 'College', 'Postgraduate', 'Vocational']
  },
  school: { type: String },
  isStudent: { type: Boolean, default: false },

  // 💉 Health Info
  hasDisability: { type: Boolean, default: false },
  disabilityType: { type: String },
  bloodType: {
    type: String,
    enum: ['A', 'B', 'AB', 'O', 'Unknown']
  },

  // 🪪 Government IDs
  philHealthNumber: { type: String },
  sssNumber: { type: String },
  gsisNumber: { type: String },
  tinNumber: { type: String },

  // 🏠 Address & Contact
  purok: { type: String, required: true },
  houseNumber: { type: String },
  contactNumber: { type: String },
  email: { type: String },

  // 🗳 Voter Info
  isVoter: { type: Boolean, default: false },
  voterIdNumber: { type: String, unique: true, sparse: true },

  // 💼 Employment
  employmentStatus: {
    type: String,
    enum: ['Employed', 'Unemployed', 'Self-Employed', 'Student', 'Retired'],
    default: 'Unemployed'
  },
  occupation: { type: String },
  employer: { type: String },

  // 👪 Household Info
  household: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household'
  },
  relationshipToHead: {
    type: String,
    enum: ['Head', 'Spouse', 'Child', 'Sibling', 'Parent', 'Relative', 'Boarder', 'Other']
  },

  // ⚠️ Residency Status
  status: {
    type: String,
    enum: ['Active', 'Deceased', 'Transferred', 'Migrated'],
    default: 'Active'
  },
  statusDate: { type: Date },
  remarks: { type: String },

  // 🖼 Avatar & QR
  avatar: { type: String, default: '' },
  qrCode: { type: String },

  // 📍 GeoLocation (optional for mapping)
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },

  // 🧾 System Info
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date }

}, { timestamps: true });


// 🔁 Recalculate total members when resident is saved
residentSchema.post('save', async function () {
  if (this.household) {
    const count = await mongoose.model('Resident').countDocuments({ household: this.household });

    await Household.findByIdAndUpdate(this.household, {
      totalMembers: count
    });

    // 👑 Set as head if household has no head yet
    const household = await Household.findById(this.household);
    if (household && !household.head) {
      household.head = this._id;
      await household.save();
    }
  }
});

// ❌ Recalculate total members when resident is deleted
residentSchema.post('findOneAndDelete', async function (doc) {
  if (doc?.household) {
    const count = await mongoose.model('Resident').countDocuments({ household: doc.household });
    await Household.findByIdAndUpdate(doc.household, {
      totalMembers: count
    });
  }
});

module.exports = mongoose.model('Resident', residentSchema);
