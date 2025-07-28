const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  image: { type: String }, // File path
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  published: { type: Boolean, default: true },
  visibleTo: { type: String, enum: ['public', 'internal'], default: 'public' }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);