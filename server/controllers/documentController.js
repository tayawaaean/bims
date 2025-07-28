const DocumentRequest = require('../models/DocumentRequest');
const Resident = require('../models/Resident');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

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

    // Optional: Generate QR code for this document (for PDF later)
    request.qrCode = `BRGY-DOC-${request._id}`;

    request.status = 'Approved';
    request.issuedBy = req.user._id;
    request.issuedAt = new Date();

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

// 🖨 Generate and download the approved document as PDF (auto-filled, QR, signature)
exports.downloadPdf = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await DocumentRequest.findById(requestId).populate('resident');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Approved' && request.status !== 'Claimed')
      return res.status(400).json({ message: 'Document not yet approved' });

    // Generate QR code as Data URL (for verification or info)
    const qrData = `https://yourdomain.com/verify/${request._id}`;
    const qrImage = await QRCode.toDataURL(qrData);

    // Create the PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', `attachment; filename=${request.type || 'document'}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('Republic of the Philippines', { align: 'center' });
    doc.fontSize(16).text('Barangay Official Document', { align: 'center' });
    doc.moveDown(2);

    // Resident and Document Info
    doc.fontSize(12).text(`Document Type: ${request.type}`);
    doc.text(`Request Purpose: ${request.purpose}`);
    doc.text(`Resident Name: ${request.resident.firstName} ${request.resident.lastName}`);
    doc.text(`Document Number: ${request._id}`);
    doc.text(`Date Issued: ${request.issuedAt ? request.issuedAt.toLocaleDateString() : ''}`);
    doc.moveDown();

    // QR Code (drawn at right side)
    doc.image(qrImage, doc.page.width - 150, 120, { width: 100 });

    // (Optional) Signature and/or Seal image
    // doc.image('assets/signature.png', 100, 400, { width: 120 });
    // doc.image('assets/seal.png', 300, 400, { width: 80 });

    // Footer
    doc.text('This document is system-generated and valid for its intended legal use.', 40, doc.page.height - 100, { align: 'center' });

    doc.end();
  } catch (err) {
    logger.error(`❌ Failed to generate PDF: ${err.message}`);
    res.status(500).json({ message: 'Server error generating PDF' });
  }
};