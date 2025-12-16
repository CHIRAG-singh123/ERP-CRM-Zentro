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

router.route('/').get(getDeals).post(createDeal);
router.route('/import').post(importDeals);
router.route('/export').get(exportDeals);
router.route('/:id').get(getDeal).put(updateDeal).delete(deleteDeal);

export default router;

