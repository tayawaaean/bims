const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadBlotterAttachment');
const {
  createBlotter,
  getBlotters,
  getBlotterById,
  updateBlotter,
  deleteBlotter,
  uploadAttachment,
  exportBlotterPDF,
  exportBlotterExcel
} = require('../controllers/blotterController');

// Public submission (anonymous allowed)
router.post('/public', createBlotter);

// CRUD for authenticated users
router.post('/', protect, createBlotter);
router.get('/', protect, getBlotters);
router.get('/:id', protect, getBlotterById);
router.put('/:id', protect, updateBlotter);
router.delete('/:id', protect, adminOnly, deleteBlotter);

// File upload for attachments
router.post('/:id/attachments', protect, upload.array('attachments', 5), uploadAttachment);

// Export routes
router.get('/export/pdf', protect, adminOnly, exportBlotterPDF);
router.get('/export/excel', protect, adminOnly, exportBlotterExcel);

module.exports = router;