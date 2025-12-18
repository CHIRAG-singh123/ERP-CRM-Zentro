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

// Middleware to check admin role (authenticate is already applied)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// View operations - available to admin and employee
router.route('/').get(getLeads);
router.route('/export').get(exportLeads);
router.route('/:id').get(getLead);

// Create/Update/Delete operations - admin only
router.route('/').post(requireAdmin, createLead);
router.route('/import').post(requireAdmin, importLeads);
router.route('/:id').put(requireAdmin, updateLead).delete(requireAdmin, deleteLead);
router.route('/:id/convert').post(requireAdmin, convertLeadToDeal);

export default router;

