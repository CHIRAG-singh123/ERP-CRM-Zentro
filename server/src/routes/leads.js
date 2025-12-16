import express from 'express';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToDeal,
  importLeads,
  exportLeads,
} from '../controllers/leadController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getLeads).post(createLead);
router.route('/import').post(importLeads);
router.route('/export').get(exportLeads);
router.route('/:id').get(getLead).put(updateLead).delete(deleteLead);
router.route('/:id/convert').post(convertLeadToDeal);

export default router;

