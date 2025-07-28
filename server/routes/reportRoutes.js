const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const reportController = require('../controllers/reportController');

// All endpoints return JSON for dashboard/graphs
router.get('/population', protect, adminOnly, reportController.populationBreakdown);
router.get('/demographics', protect, adminOnly, reportController.demographics);
router.get('/voter', protect, adminOnly, reportController.voterStats);
router.get('/documents', protect, adminOnly, reportController.documentSummary);
router.get('/blotters', protect, adminOnly, reportController.blotterStats);

// Export endpoints for reports/statistics (PDF/Excel)
router.get('/population/export/pdf', protect, adminOnly, reportController.populationExportPDF);
router.get('/population/export/excel', protect, adminOnly, reportController.populationExportExcel);

router.get('/demographics/export/pdf', protect, adminOnly, reportController.demographicsExportPDF);
router.get('/demographics/export/excel', protect, adminOnly, reportController.demographicsExportExcel);

router.get('/voter/export/pdf', protect, adminOnly, reportController.voterStatsExportPDF);
router.get('/voter/export/excel', protect, adminOnly, reportController.voterStatsExportExcel);

router.get('/documents/export/pdf', protect, adminOnly, reportController.documentSummaryExportPDF);
router.get('/documents/export/excel', protect, adminOnly, reportController.documentSummaryExportExcel);

router.get('/blotters/export/pdf', protect, adminOnly, reportController.blotterStatsExportPDF);
router.get('/blotters/export/excel', protect, adminOnly, reportController.blotterStatsExportExcel);

module.exports = router;