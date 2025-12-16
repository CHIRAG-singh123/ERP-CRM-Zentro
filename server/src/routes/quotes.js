import express from 'express';
import {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  updateQuoteStatus,
} from '../controllers/quoteController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getQuotes);
router.get('/:id', getQuote);
router.post('/', createQuote);
router.put('/:id', updateQuote);
router.patch('/:id/status', updateQuoteStatus);
router.delete('/:id', deleteQuote);

export default router;

