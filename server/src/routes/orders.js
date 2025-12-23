import express from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id', cancelOrder);

export default router;

