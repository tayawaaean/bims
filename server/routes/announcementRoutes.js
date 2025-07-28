const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadAnnouncementImage');
const {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

// Public GET: view announcements
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);

// Admin/Staff: create, update, delete
router.post('/', protect, adminOnly, upload.single('image'), createAnnouncement);
router.put('/:id', protect, adminOnly, upload.single('image'), updateAnnouncement);
router.delete('/:id', protect, adminOnly, deleteAnnouncement);

module.exports = router;