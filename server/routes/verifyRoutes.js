const express = require('express');
const router = express.Router();
const Resident = require('../models/Resident');
const DocumentRequest = require('../models/DocumentRequest');

// Verify document
router.get('/document/:id', async (req, res) => {
  try {
    const doc = await DocumentRequest.findById(req.params.id).populate('resident');
    if (!doc) return res.status(404).json({ valid: false, message: 'Document not found.' });

    // Optionally check doc.status === 'Approved' or 'Claimed'
    if (doc.status !== 'Approved' && doc.status !== 'Claimed') {
      return res.status(400).json({ valid: false, message: 'Document is not valid.' });
    }

    res.json({
      valid: true,
      document: {
        id: doc._id,
        type: doc.type,
        resident: `${doc.resident.firstName} ${doc.resident.lastName}`,
        status: doc.status,
        issuedAt: doc.issuedAt,
      }
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Server error.' });
  }
});

// Verify resident (optional)
router.get('/resident/:id', async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident) return res.status(404).json({ valid: false, message: 'Resident not found.' });

    res.json({
      valid: true,
      resident: {
        id: resident._id,
        name: `${resident.firstName} ${resident.lastName}`,
        status: resident.status,
        purok: resident.purok
      }
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Server error.' });
  }
});

module.exports = router;