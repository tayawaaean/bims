const Announcement = require('../models/Announcement');
const logger = require('../utils/logger');
const path = require('path');
const auditLog = require('../utils/auditLogger'); // <--- add this

// Create new announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const announcement = new Announcement({
      title: req.body.title,
      content: req.body.content,
      image: req.file ? path.join('/uploads/announcements/', req.file.filename) : undefined,
      postedBy: req.user?._id,
      published: req.body.published ?? true,
      visibleTo: req.body.visibleTo || 'public'
    });
    await announcement.save();
    logger.info(`📢 Announcement created: ${announcement._id}`);

    // Audit log
    await auditLog(
      req.user?._id,
      'Create Announcement',
      `Created announcement: "${announcement.title}" (ID: ${announcement._id})`
    );

    res.status(201).json({ message: 'Announcement posted', announcement });
  } catch (err) {
    logger.error(`❌ Error creating announcement: ${err.message}`);
    res.status(500).json({ message: 'Error creating announcement' });
  }
};

// Get all announcements (with optional filters, pagination)
exports.getAnnouncements = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, published, visibleTo } = req.query;
    const filter = {};

    if (published !== undefined) filter.published = published === 'true';
    if (visibleTo) filter.visibleTo = visibleTo;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Announcement.countDocuments(filter);
    const announcements = await Announcement.find(filter)
      .populate('postedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      announcements,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    logger.error(`❌ Error fetching announcements: ${err.message}`);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
};

// Get single announcement
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('postedBy', 'name username');
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.status(200).json(announcement);
  } catch (err) {
    logger.error(`❌ Error fetching announcement: ${err.message}`);
    res.status(500).json({ message: 'Error fetching announcement' });
  }
};

// Update announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const update = {
      ...req.body
    };
    if (req.file) {
      update.image = path.join('/uploads/announcements/', req.file.filename);
    }
    const before = await Announcement.findById(req.params.id);
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('postedBy', 'name username');
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    logger.info(`✏️ Announcement updated: ${announcement._id}`);

    // Audit log (log before and after)
    await auditLog(
      req.user?._id,
      'Update Announcement',
      `Announcement ID: ${announcement._id}\nBefore: ${JSON.stringify(before)}\nAfter: ${JSON.stringify(announcement)}`
    );

    res.status(200).json({ message: 'Announcement updated', announcement });
  } catch (err) {
    logger.error(`❌ Error updating announcement: ${err.message}`);
    res.status(500).json({ message: 'Error updating announcement' });
  }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Announcement not found' });
    logger.info(`🗑️ Announcement deleted: ${deleted._id}`);

    // Audit log
    await auditLog(
      req.user?._id,
      'Delete Announcement',
      `Deleted announcement: "${deleted.title}" (ID: ${deleted._id})`
    );

    res.status(200).json({ message: 'Announcement deleted' });
  } catch (err) {
    logger.error(`❌ Error deleting announcement: ${err.message}`);
    res.status(500).json({ message: 'Error deleting announcement' });
  }
};