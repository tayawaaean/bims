const express = require('express');
const router = express.Router();

const {
  createRequest,
  approveRequest,
  getRequests,
  markAsClaimed,
  downloadPdf
} = require('../controllers/documentController');

const { protect, adminOnly } = require('../middlewares/authMiddleware');

// 📄 Create new document request (Resident)
router.post('/', protect, createRequest);

// ✅ Approve & issue a document (Admin)
router.put('/:id/approve', protect, adminOnly, approveRequest);

// 🟩 Mark as claimed (Admin)
router.put('/:id/claim', protect, adminOnly, markAsClaimed);

// 📋 Get all document requests (Admin only)
router.get('/', protect, adminOnly, getRequests);

// 🖨 Download PDF of approved/claimed document (Admin only)
router.get('/:id/pdf', protect, adminOnly, downloadPdf);

module.exports = router;