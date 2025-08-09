const Blotter = require('../models/Blotter');
const logger = require('../utils/logger');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const auditLog = require('../utils/auditLogger'); // <-- Add this

// Create new or public blotter
exports.createBlotter = async (req, res) => {
  try {
    const isPublicSubmission = req.baseUrl.endsWith('/public');
    const userId = req.user ? req.user._id : null;

    // Initial status history
    const statusHistory = [{
      status: req.body.status || 'Pending',
      changedBy: userId,
      remarks: req.body.remarks || ''
    }];

    const blotter = new Blotter({
      ...req.body,
      status: req.body.status || 'Pending',
      createdBy: userId,
      statusHistory,
      isPublic: isPublicSubmission
    });

    await blotter.save();
    logger.info(`📝 Blotter created: ${blotter._id} (public: ${isPublicSubmission})`);

    await auditLog(
      userId,
      'Create Blotter',
      `Created blotter: ${blotter._id}, status: ${blotter.status}, isPublic: ${isPublicSubmission}`
    );

    res.status(201).json({ message: 'Blotter recorded', blotter });
  } catch (err) {
    logger.error(`❌ Error creating blotter: ${err.message}`);
    await auditLog(req.user?._id, 'Create Blotter Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error creating blotter' });
  }
};

// Advanced search & pagination
exports.getBlotters = async (req, res) => {
  try {
    // ... unchanged ...
    const {
      status,
      complainant,
      respondent,
      complainantName,
      respondentName,
      location,
      from,
      to,
      search,
      approvalStatus,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (complainant) filter.complainant = complainant;
    if (respondent) filter.respondent = respondent;
    if (complainantName) filter.complainantName = { $regex: complainantName, $options: 'i' };
    if (respondentName) filter.respondentName = { $regex: respondentName, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };

    if (from || to) {
      filter.incidentDate = {};
      if (from) filter.incidentDate.$gte = new Date(from);
      if (to) filter.incidentDate.$lte = new Date(to);
    }

    if (approvalStatus) filter.approvalStatus = approvalStatus;

    if (search) {
      filter.$or = [
        { natureOfComplaint: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { complainantName: { $regex: search, $options: 'i' } },
        { respondentName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Blotter.countDocuments(filter);

    const blotters = await Blotter.find(filter)
      .populate('complainant', 'firstName lastName')
      .populate('respondent', 'firstName lastName')
      .populate('createdBy', 'name username')
      .populate('caseHandler', 'name username')
      .populate('approvedBy', 'name username')
      .sort({ incidentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      blotters,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    logger.error(`❌ Error fetching blotters: ${err.message}`);
    res.status(500).json({ message: 'Error fetching blotters' });
  }
};

// Get a single blotter
exports.getBlotterById = async (req, res) => {
  try {
    const blotter = await Blotter.findById(req.params.id)
      .populate('complainant', 'firstName lastName')
      .populate('respondent', 'firstName lastName')
      .populate('createdBy', 'name username')
      .populate('caseHandler', 'name username')
      .populate('approvedBy', 'name username');

    if (!blotter) return res.status(404).json({ message: 'Blotter not found' });
    res.status(200).json(blotter);
  } catch (err) {
    logger.error(`❌ Error fetching blotter: ${err.message}`);
    res.status(500).json({ message: 'Error fetching blotter' });
  }
};

// Update blotter (status, handler, workflow, etc)
exports.updateBlotter = async (req, res) => {
  try {
    const blotter = await Blotter.findById(req.params.id);
    if (!blotter) return res.status(404).json({ message: 'Blotter not found' });

    const before = JSON.stringify(blotter);

    // Case Handler assignment
    if (req.body.caseHandler) {
      blotter.caseHandler = req.body.caseHandler;
    }

    // Status workflow/history
    if (req.body.status && req.body.status !== blotter.status) {
      blotter.statusHistory.push({
        status: req.body.status,
        changedBy: req.user ? req.user._id : null,
        remarks: req.body.remarks || ''
      });
      blotter.status = req.body.status;
    }

    // Other updates (safe fields only)
    [
      'complainant', 'respondent', 'complainantName', 'respondentName',
      'incidentDate', 'incidentTime', 'location', 'natureOfComplaint',
      'description', 'actionTaken', 'remarks'
    ].forEach(field => {
      if (req.body[field] !== undefined) blotter[field] = req.body[field];
    });
    blotter.updatedBy = req.user ? req.user._id : null;

    await blotter.save();

    await auditLog(
      req.user ? req.user._id : null,
      'Update Blotter',
      `Blotter ID: ${blotter._id}\nBefore: ${before}\nAfter: ${JSON.stringify(blotter)}`
    );

    res.status(200).json({ message: 'Blotter updated', blotter });
  } catch (err) {
    await auditLog(req.user?._id, 'Update Blotter Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error updating blotter' });
  }
};

// Delete a blotter
exports.deleteBlotter = async (req, res) => {
  try {
    const deleted = await Blotter.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Blotter not found' });
    logger.info(`🗑️ Blotter deleted: ${deleted._id}`);

    await auditLog(
      req.user ? req.user._id : null,
      'Delete Blotter',
      `Deleted blotter: ${deleted._id}, complainant: ${deleted.complainantName}, respondent: ${deleted.respondentName}`
    );

    res.status(200).json({ message: 'Blotter deleted' });
  } catch (err) {
    logger.error(`❌ Error deleting blotter: ${err.message}`);
    await auditLog(req.user?._id, 'Delete Blotter Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error deleting blotter' });
  }
};

// Upload attachments
exports.uploadAttachment = async (req, res) => {
  try {
    const blotter = await Blotter.findById(req.params.id);
    if (!blotter) return res.status(404).json({ message: 'Blotter not found' });

    if (req.files && req.files.length > 0) {
      const attachmentPaths = req.files.map(file =>
        path.join('/uploads/blotters/', file.filename)
      );
      blotter.attachments = blotter.attachments.concat(attachmentPaths);
      blotter.updatedBy = req.user ? req.user._id : null;
      await blotter.save();

      await auditLog(
        req.user ? req.user._id : null,
        'Upload Blotter Attachment',
        `Blotter ID: ${blotter._id}, Uploaded: ${attachmentPaths.join(', ')}`
      );
    }

    logger.info(`📎 Attachments uploaded for blotter: ${blotter._id}`);
    res.status(200).json({
      message: 'Attachments uploaded successfully',
      attachments: blotter.attachments
    });
  } catch (err) {
    logger.error(`❌ Error uploading attachments: ${err.message}`);
    await auditLog(req.user?._id, 'Upload Blotter Attachment Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error uploading attachments' });
  }
};

// Export Blotters as PDF
exports.exportBlotterPDF = async (req, res) => {
  try {
    const blotters = await Blotter.find()
      .sort({ incidentDate: -1, createdAt: -1 });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Disposition', 'attachment; filename=blotter_report.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Barangay Blotter Report', { align: 'center' });
    doc.moveDown();

    blotters.forEach((b, i) => {
      doc.fontSize(12).text(`Case #: ${b._id}`);
      doc.text(`Complainant: ${b.complainantName || ''}`);
      doc.text(`Respondent: ${b.respondentName || ''}`);
      doc.text(`Incident Date: ${b.incidentDate ? new Date(b.incidentDate).toLocaleDateString() : ''}`);
      doc.text(`Location: ${b.location || ''}`);
      doc.text(`Nature: ${b.natureOfComplaint || ''}`);
      doc.text(`Description: ${b.description || ''}`);
      doc.text(`Status: ${b.status}`);
      doc.text(`Approval Status: ${b.approvalStatus || 'pending'}`);
      doc.text(`Approved By: ${b.approvedBy || ''}`);
      doc.text(`Approved At: ${b.approvedAt ? new Date(b.approvedAt).toLocaleString() : ''}`);
      doc.text(`Approval Remarks: ${b.approvalRemarks || ''}`);
      doc.moveDown();
    });

    doc.end();

    await auditLog(
      req.user ? req.user._id : null,
      'Export Blotters PDF',
      'Exported all blotters as PDF'
    );
  } catch (err) {
    await auditLog(req.user?._id, 'Export Blotters PDF Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting PDF' });
  }
};

// Export Blotters as Excel
exports.exportBlotterExcel = async (req, res) => {
  try {
    const blotters = await Blotter.find()
      .sort({ incidentDate: -1, createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Blotter Report');
    worksheet.columns = [
      { header: 'Case #', key: '_id', width: 24 },
      { header: 'Complainant', key: 'complainantName', width: 20 },
      { header: 'Respondent', key: 'respondentName', width: 20 },
      { header: 'Incident Date', key: 'incidentDate', width: 15 },
      { header: 'Location', key: 'location', width: 18 },
      { header: 'Nature', key: 'natureOfComplaint', width: 28 },
      { header: 'Description', key: 'description', width: 32 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Approval Status', key: 'approvalStatus', width: 14 },
      { header: 'Approved By', key: 'approvedBy', width: 20 },
      { header: 'Approved At', key: 'approvedAt', width: 22 },
      { header: 'Approval Remarks', key: 'approvalRemarks', width: 32 }
    ];

    blotters.forEach(b => {
      worksheet.addRow({
        _id: b._id.toString(),
        complainantName: b.complainantName || '',
        respondentName: b.respondentName || '',
        incidentDate: b.incidentDate ? new Date(b.incidentDate).toLocaleDateString() : '',
        location: b.location || '',
        natureOfComplaint: b.natureOfComplaint || '',
        description: b.description || '',
        status: b.status || '',
        approvalStatus: b.approvalStatus || '',
        approvedBy: b.approvedBy ? b.approvedBy.toString() : '',
        approvedAt: b.approvedAt ? new Date(b.approvedAt).toLocaleString() : '',
        approvalRemarks: b.approvalRemarks || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=blotter_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();

    await auditLog(
      req.user ? req.user._id : null,
      'Export Blotters Excel',
      'Exported all blotters as Excel'
    );
  } catch (err) {
    await auditLog(req.user?._id, 'Export Blotters Excel Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting Excel' });
  }
};

// --- Official Approval Handler ---
exports.approveBlotter = async (req, res) => {
  try {
    const { approvalStatus, approvalRemarks } = req.body; // "approved" or "rejected"
    const blotter = await Blotter.findById(req.params.id);
    if (!blotter) return res.status(404).json({ message: 'Blotter not found' });

    // Prevent re-approval
    if (blotter.approvalStatus === 'approved') {
      return res.status(400).json({ message: 'Blotter already approved' });
    }

    const before = JSON.stringify(blotter);

    // Set approval details
    blotter.approvalStatus = approvalStatus || 'approved';
    blotter.approvedBy = req.user._id;
    blotter.approvedAt = new Date();
    blotter.approvalRemarks = approvalRemarks;

    await blotter.save();

    logger.info(`Blotter ${approvalStatus || 'approved'} by ${req.user.username || req.user._id}`);

    await auditLog(
      req.user ? req.user._id : null,
      'Approve Blotter',
      `Blotter ID: ${blotter._id}\nBefore: ${before}\nAfter: ${JSON.stringify(blotter)}`
    );

    res.json({ message: `Blotter ${approvalStatus || 'approved'} successfully`, blotter });
  } catch (err) {
    logger.error(`❌ Failed to approve blotter: ${err.message}`);
    await auditLog(req.user?._id, 'Approve Blotter Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Failed to approve blotter' });
  }
};