import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireCustomer } from '../middlewares/rbac.js';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// Public route
router.get('/products/:productId/reviews', getProductReviews);

// Protected routes - require customer
router.post('/products/:productId/reviews', authenticate, requireCustomer, createReview);
router.put('/:id', authenticate, requireCustomer, updateReview);
router.delete('/:id', authenticate, requireCustomer, deleteReview);

export default router;

