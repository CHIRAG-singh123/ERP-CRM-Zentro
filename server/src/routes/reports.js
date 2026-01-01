import express from 'express';
import { getKPIs, getLeadConversionAnalytics, getCrossEntityAnalytics, exportDashboardPDF, exportReportsPDF } from '../controllers/reportsController.js';
import { authenticate } from '../middlewares/auth.js';
import { requireEmployeeOrAdmin } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.get('/kpis', getKPIs);
router.get('/conversion-analytics', getLeadConversionAnalytics);
router.get('/cross-entity-analytics', getCrossEntityAnalytics);
router.get('/dashboard/export', requireEmployeeOrAdmin, exportDashboardPDF);
router.get('/export', requireEmployeeOrAdmin, exportReportsPDF);

export default router;

