import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireCustomer, requireEmployeeOrAdmin } from '../middlewares/rbac.js';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getEmployeeProductReviews,
  getEmployeeAllReviews,
  createReply,
  createNestedReply,
  updateReply,
  deleteReply,
  markReplyAsRead,
  markReviewRepliesAsRead,
  getProductUnreadCount,
  getAllProductsUnreadCounts,
} from '../controllers/reviewController.js';

const router = express.Router();

// Public route
router.get('/products/:productId/reviews', getProductReviews);

// Protected routes - require customer
router.post('/products/:productId/reviews', authenticate, requireCustomer, createReview);
router.put('/:id', authenticate, requireCustomer, updateReview);
router.delete('/:id', authenticate, requireCustomer, deleteReview);

// Employee routes - get reviews for their products
router.get('/employees/products/:productId/reviews', authenticate, requireEmployeeOrAdmin, getEmployeeProductReviews);
router.get('/employees/reviews', authenticate, requireEmployeeOrAdmin, getEmployeeAllReviews);

// Reply routes - authenticated users (employees can reply to their product reviews, customers can reply to their own reviews)
router.post('/:reviewId/replies', authenticate, createReply);
router.post('/:reviewId/replies/:replyId/replies', authenticate, createNestedReply);
router.put('/:reviewId/replies/:replyId', authenticate, updateReply);
router.delete('/:reviewId/replies/:replyId', authenticate, deleteReply);

// Read tracking routes
router.post('/:reviewId/replies/:replyId/read', authenticate, markReplyAsRead);
router.post('/:reviewId/mark-all-read', authenticate, markReviewRepliesAsRead);
router.get('/products/:productId/unread-count', authenticate, getProductUnreadCount);
router.get('/products/unread-counts', authenticate, getAllProductsUnreadCounts);

export default router;

