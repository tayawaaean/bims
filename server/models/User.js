const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'clerk', 'official', 'resident'],
    default: 'resident'
  },
  isApproved: {
    type: Boolean,
    default: false // Must be approved by admin before login
  },
  avatar: {
    type: String,
    default: '' // e.g. '/uploads/avatars/avatar-default.png'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
