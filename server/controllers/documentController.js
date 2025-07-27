const DocumentRequest = require('../models/DocumentRequest');
const Resident = require('../models/Resident');
const logger = require('../utils/logger');
// const generatePdf = require('../utils/generatePdf'); // Optional utility

// 📄 Create a new document request
exports.createRequest = async (req, res) => {
  try {
    const { resident, type, purpose } = req.body;

    const residentExists = await Resident.findById(resident);
    if (!residentExists) return res.status(404).json({ message: 'Resident not found' });

    const request = new DocumentRequest({
      resident,
      type,
      purpose
    });

    await request.save();
    logger.info(`📥 Document requested: ${type} for ${resident}`);
    res.status(201).json({ message: 'Request created', request });

  } catch (err) {
    logger.error(`❌ Failed to create request: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Approve and issue the document
exports.approveRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await DocumentRequest.findById(requestId).populate('resident');

    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.status === 'Approved') {
      return res.status(400).json({ message: 'Request already approved' });
    }

    // Optional: Generate PDF
    // const filePath = await generatePdf(request);

    request.status = 'Approved';
    request.issuedBy = req.user._id;
    request.issuedAt = new Date();
    // request.filePath = filePath;

    // Generate QR (optional stub)
    request.qrCode = `BRGY-DOC-${request._id}`;

    await request.save();

    logger.info(`✅ Document approved: ${request.type}`);
    res.status(200).json({ message: 'Request approved', request });

  } catch (err) {
    logger.error(`❌ Failed to approve request: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📋 Get all requests (filterable)
exports.getRequests = async (req, res) => {
  try {
    const { status, type, resident } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (resident) filter.resident = resident;

    const requests = await DocumentRequest.find(filter)
      .populate('resident', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (err) {
    logger.error(`❌ Failed to fetch requests: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🟩 Mark document as claimed
exports.markAsClaimed = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await DocumentRequest.findById(requestId);

    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'Claimed';
    await request.save();

    logger.info(`🎉 Document claimed: ${request._id}`);
    res.status(200).json({ message: 'Marked as claimed', request });

  } catch (err) {
    logger.error(`❌ Failed to mark as claimed: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};
