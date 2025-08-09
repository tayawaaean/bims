const Resident = require('../models/Resident');
const Document = require('../models/DocumentRequest');
const Blotter = require('../models/Blotter');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const auditLog = require('../utils/auditLogger'); // <-- Add this

// Population breakdown: by purok, gender, age group
exports.populationBreakdown = async (req, res) => {
  try {
    const purokAgg = await Resident.aggregate([
      { $group: { _id: "$address.purok", count: { $sum: 1 } } }
    ]);
    const genderAgg = await Resident.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } }
    ]);
    const now = new Date();
    const ageAgg = await Resident.aggregate([
      {
        $project: {
          age: {
            $dateDiff: {
              startDate: "$birthdate",
              endDate: now,
              unit: "year"
            }
          }
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 13, 18, 60, 200],
          default: "Unknown",
          output: { count: { $sum: 1 } }
        }
      }
    ]);
    await auditLog(req.user?._id, 'Get Population Breakdown', 'Population breakdown data retrieved');
    res.json({
      purok: purokAgg,
      gender: genderAgg,
      ageGroups: [
        { label: "0-12", count: ageAgg[0]?.count || 0 },
        { label: "13-17", count: ageAgg[1]?.count || 0 },
        { label: "18-59", count: ageAgg[2]?.count || 0 },
        { label: "60+", count: ageAgg[3]?.count || 0 }
      ]
    });
  } catch (err) {
    await auditLog(req.user?._id, 'Get Population Breakdown Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error generating population breakdown' });
  }
};

// Export population breakdown as PDF
exports.populationExportPDF = async (req, res) => {
  try {
    const purokAgg = await Resident.aggregate([{ $group: { _id: "$address.purok", count: { $sum: 1 } } }]);
    const genderAgg = await Resident.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]);
    const now = new Date();
    const ageAgg = await Resident.aggregate([
      { $project: { age: { $dateDiff: { startDate: "$birthdate", endDate: now, unit: "year" } } } },
      { $bucket: {
        groupBy: "$age",
        boundaries: [0, 13, 18, 60, 200],
        default: "Unknown",
        output: { count: { $sum: 1 } }
      } }
    ]);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', 'attachment; filename=population_breakdown.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Population Breakdown', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text('By Purok:');
    purokAgg.forEach(row => doc.text(` - ${row._id}: ${row.count}`));
    doc.moveDown();

    doc.text('By Gender:');
    genderAgg.forEach(row => doc.text(` - ${row._id}: ${row.count}`));
    doc.moveDown();

    doc.text('By Age Group:');
    doc.text(` - 0-12: ${ageAgg[0]?.count || 0}`);
    doc.text(` - 13-17: ${ageAgg[1]?.count || 0}`);
    doc.text(` - 18-59: ${ageAgg[2]?.count || 0}`);
    doc.text(` - 60+: ${ageAgg[3]?.count || 0}`);

    doc.end();

    await auditLog(req.user?._id, 'Export Population Breakdown PDF', 'Population breakdown exported as PDF');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Population Breakdown PDF Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting PDF' });
  }
};

// Export population breakdown as Excel
exports.populationExportExcel = async (req, res) => {
  try {
    const purokAgg = await Resident.aggregate([{ $group: { _id: "$address.purok", count: { $sum: 1 } } }]);
    const genderAgg = await Resident.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]);
    const now = new Date();
    const ageAgg = await Resident.aggregate([
      { $project: { age: { $dateDiff: { startDate: "$birthdate", endDate: now, unit: "year" } } } },
      { $bucket: {
        groupBy: "$age",
        boundaries: [0, 13, 18, 60, 200],
        default: "Unknown",
        output: { count: { $sum: 1 } }
      } }
    ]);
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Population Breakdown');
    ws.addRow(['By Purok']);
    purokAgg.forEach(row => ws.addRow([row._id, row.count]));
    ws.addRow([]);
    ws.addRow(['By Gender']);
    genderAgg.forEach(row => ws.addRow([row._id, row.count]));
    ws.addRow([]);
    ws.addRow(['By Age Group']);
    ws.addRow(['0-12', ageAgg[0]?.count || 0]);
    ws.addRow(['13-17', ageAgg[1]?.count || 0]);
    ws.addRow(['18-59', ageAgg[2]?.count || 0]);
    ws.addRow(['60+', ageAgg[3]?.count || 0]);

    res.setHeader('Content-Disposition', 'attachment; filename=population_breakdown.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();

    await auditLog(req.user?._id, 'Export Population Breakdown Excel', 'Population breakdown exported as Excel');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Population Breakdown Excel Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting Excel' });
  }
};

// Resident demographics: civil status, employment, education, tags
exports.demographics = async (req, res) => {
  try {
    const civilStatus = await Resident.aggregate([
      { $group: { _id: "$civilStatus", count: { $sum: 1 } } }
    ]);
    const employed = await Resident.countDocuments({ employment: { $exists: true, $ne: "" } });
    const unemployed = await Resident.countDocuments({ employment: { $in: [null, ""] } });
    const pwd = await Resident.countDocuments({ tags: "PWD" });
    const senior = await Resident.countDocuments({ tags: "Senior Citizen" });
    const soloParent = await Resident.countDocuments({ tags: "Solo Parent" });
    await auditLog(req.user?._id, 'Get Demographics', 'Demographics data retrieved');
    res.json({
      civilStatus,
      employed,
      unemployed,
      pwd,
      senior,
      soloParent
    });
  } catch (err) {
    await auditLog(req.user?._id, 'Get Demographics Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error generating demographics' });
  }
};

// Export demographics as PDF
exports.demographicsExportPDF = async (req, res) => {
  try {
    const civilStatus = await Resident.aggregate([{ $group: { _id: "$civilStatus", count: { $sum: 1 } } }]);
    const employed = await Resident.countDocuments({ employment: { $exists: true, $ne: "" } });
    const unemployed = await Resident.countDocuments({ employment: { $in: [null, ""] } });
    const pwd = await Resident.countDocuments({ tags: "PWD" });
    const senior = await Resident.countDocuments({ tags: "Senior Citizen" });
    const soloParent = await Resident.countDocuments({ tags: "Solo Parent" });

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', 'attachment; filename=demographics.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Resident Demographics', { align: 'center' });
    doc.moveDown();

    doc.text('Civil Status:');
    civilStatus.forEach(row => doc.text(` - ${row._id || "Unknown"}: ${row.count}`));
    doc.moveDown();

    doc.text(`Employed: ${employed}`);
    doc.text(`Unemployed: ${unemployed}`);
    doc.text(`PWD: ${pwd}`);
    doc.text(`Senior Citizen: ${senior}`);
    doc.text(`Solo Parent: ${soloParent}`);

    doc.end();

    await auditLog(req.user?._id, 'Export Demographics PDF', 'Demographics exported as PDF');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Demographics PDF Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting PDF' });
  }
};

// Export demographics as Excel
exports.demographicsExportExcel = async (req, res) => {
  try {
    const civilStatus = await Resident.aggregate([{ $group: { _id: "$civilStatus", count: { $sum: 1 } } }]);
    const employed = await Resident.countDocuments({ employment: { $exists: true, $ne: "" } });
    const unemployed = await Resident.countDocuments({ employment: { $in: [null, ""] } });
    const pwd = await Resident.countDocuments({ tags: "PWD" });
    const senior = await Resident.countDocuments({ tags: "Senior Citizen" });
    const soloParent = await Resident.countDocuments({ tags: "Solo Parent" });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Demographics');
    ws.addRow(['Civil Status']);
    civilStatus.forEach(row => ws.addRow([row._id || "Unknown", row.count]));
    ws.addRow([]);
    ws.addRow(['Employed', employed]);
    ws.addRow(['Unemployed', unemployed]);
    ws.addRow(['PWD', pwd]);
    ws.addRow(['Senior Citizen', senior]);
    ws.addRow(['Solo Parent', soloParent]);

    res.setHeader('Content-Disposition', 'attachment; filename=demographics.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();

    await auditLog(req.user?._id, 'Export Demographics Excel', 'Demographics exported as Excel');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Demographics Excel Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting Excel' });
  }
};

// Voter vs. Non-voter count
exports.voterStats = async (req, res) => {
  try {
    const voters = await Resident.countDocuments({ voterStatus: "Voter" });
    const nonVoters = await Resident.countDocuments({ voterStatus: { $ne: "Voter" } });
    await auditLog(req.user?._id, 'Get Voter Stats', 'Voter stats data retrieved');
    res.json({ voters, nonVoters });
  } catch (err) {
    await auditLog(req.user?._id, 'Get Voter Stats Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error generating voter stats' });
  }
};

// Export voter stats as PDF
exports.voterStatsExportPDF = async (req, res) => {
  try {
    const voters = await Resident.countDocuments({ voterStatus: "Voter" });
    const nonVoters = await Resident.countDocuments({ voterStatus: { $ne: "Voter" } });

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', 'attachment; filename=voter_stats.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Voter Statistics', { align: 'center' });
    doc.moveDown();

    doc.text(`Voters: ${voters}`);
    doc.text(`Non-voters: ${nonVoters}`);

    doc.end();

    await auditLog(req.user?._id, 'Export Voter Stats PDF', 'Voter stats exported as PDF');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Voter Stats PDF Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting PDF' });
  }
};

// Export voter stats as Excel
exports.voterStatsExportExcel = async (req, res) => {
  try {
    const voters = await Resident.countDocuments({ voterStatus: "Voter" });
    const nonVoters = await Resident.countDocuments({ voterStatus: { $ne: "Voter" } });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Voter Stats');
    ws.addRow(['Voter Status', 'Count']);
    ws.addRow(['Voters', voters]);
    ws.addRow(['Non-voters', nonVoters]);

    res.setHeader('Content-Disposition', 'attachment; filename=voter_stats.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();

    await auditLog(req.user?._id, 'Export Voter Stats Excel', 'Voter stats exported as Excel');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Voter Stats Excel Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting Excel' });
  }
};

// Document issuance summary (by type)
exports.documentSummary = async (req, res) => {
  try {
    const byType = await Document.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);
    const byStatus = await Document.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    await auditLog(req.user?._id, 'Get Document Summary', 'Document summary data retrieved');
    res.json({ byType, byStatus });
  } catch (err) {
    await auditLog(req.user?._id, 'Get Document Summary Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error generating document summary' });
  }
};

// Export document summary as PDF
exports.documentSummaryExportPDF = async (req, res) => {
  try {
    const byType = await Document.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]);
    const byStatus = await Document.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', 'attachment; filename=document_summary.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Document Issuance Summary', { align: 'center' });
    doc.moveDown();

    doc.text('By Type:');
    byType.forEach(row => doc.text(` - ${row._id}: ${row.count}`));
    doc.moveDown();

    doc.text('By Status:');
    byStatus.forEach(row => doc.text(` - ${row._id}: ${row.count}`));

    doc.end();

    await auditLog(req.user?._id, 'Export Document Summary PDF', 'Document summary exported as PDF');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Document Summary PDF Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting PDF' });
  }
};

// Export document summary as Excel
exports.documentSummaryExportExcel = async (req, res) => {
  try {
    const byType = await Document.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]);
    const byStatus = await Document.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Document Summary');
    ws.addRow(['By Type']);
    byType.forEach(row => ws.addRow([row._id, row.count]));
    ws.addRow([]);
    ws.addRow(['By Status']);
    byStatus.forEach(row => ws.addRow([row._id, row.count]));

    res.setHeader('Content-Disposition', 'attachment; filename=document_summary.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();

    await auditLog(req.user?._id, 'Export Document Summary Excel', 'Document summary exported as Excel');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Document Summary Excel Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting Excel' });
  }
};

// Blotter statistics: by status, by month
exports.blotterStats = async (req, res) => {
  try {
    // Cases by status
    const byStatus = await Blotter.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    // Cases by month (for the past 12 months)
    const lastYear = new Date();
    lastYear.setMonth(lastYear.getMonth() - 12);
    const byMonth = await Blotter.aggregate([
      { $match: { incidentDate: { $gte: lastYear } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$incidentDate" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    await auditLog(req.user?._id, 'Get Blotter Stats', 'Blotter stats data retrieved');
    res.json({ byStatus, byMonth });
  } catch (err) {
    await auditLog(req.user?._id, 'Get Blotter Stats Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error generating blotter stats' });
  }
};

// Export blotter stats as PDF
exports.blotterStatsExportPDF = async (req, res) => {
  try {
    const byStatus = await Blotter.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const lastYear = new Date();
    lastYear.setMonth(lastYear.getMonth() - 12);
    const byMonth = await Blotter.aggregate([
      { $match: { incidentDate: { $gte: lastYear } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$incidentDate" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', 'attachment; filename=blotter_stats.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Blotter Statistics', { align: 'center' });
    doc.moveDown();

    doc.text('By Status:');
    byStatus.forEach(row => doc.text(` - ${row._id}: ${row.count}`));
    doc.moveDown();

    doc.text('By Month (last 12):');
    byMonth.forEach(row => doc.text(` - ${row._id}: ${row.count}`));

    doc.end();

    await auditLog(req.user?._id, 'Export Blotter Stats PDF', 'Blotter stats exported as PDF');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Blotter Stats PDF Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting PDF' });
  }
};

// Export blotter stats as Excel
exports.blotterStatsExportExcel = async (req, res) => {
  try {
    const byStatus = await Blotter.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const lastYear = new Date();
    lastYear.setMonth(lastYear.getMonth() - 12);
    const byMonth = await Blotter.aggregate([
      { $match: { incidentDate: { $gte: lastYear } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$incidentDate" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Blotter Stats');
    ws.addRow(['By Status']);
    byStatus.forEach(row => ws.addRow([row._id, row.count]));
    ws.addRow([]);
    ws.addRow(['By Month (last 12)']);
    byMonth.forEach(row => ws.addRow([row._id, row.count]));

    res.setHeader('Content-Disposition', 'attachment; filename=blotter_stats.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();

    await auditLog(req.user?._id, 'Export Blotter Stats Excel', 'Blotter stats exported as Excel');
  } catch (err) {
    await auditLog(req.user?._id, 'Export Blotter Stats Excel Failed', `Error: ${err.message}`);
    res.status(500).json({ message: 'Error exporting Excel' });
  }
};