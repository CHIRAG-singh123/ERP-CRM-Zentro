import express from 'express';
import { getKPIs, getLeadConversionAnalytics, getCrossEntityAnalytics } from '../controllers/reportsController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/kpis', getKPIs);
router.get('/conversion-analytics', getLeadConversionAnalytics);
router.get('/cross-entity-analytics', getCrossEntityAnalytics);

export default router;

