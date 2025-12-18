import express from 'express';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  importDeals,
  exportDeals,
} from '../controllers/dealController.js';
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
router.route('/').get(getDeals);
router.route('/export').get(exportDeals);
router.route('/:id').get(getDeal);

// Create/Update/Delete operations - admin only
router.route('/').post(requireAdmin, createDeal);
router.route('/import').post(requireAdmin, importDeals);
router.route('/:id').put(requireAdmin, updateDeal).delete(requireAdmin, deleteDeal);

export default router;

