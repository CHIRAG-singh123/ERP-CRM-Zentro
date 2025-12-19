import express from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  downloadInvoicePDF,
} from '../controllers/invoiceController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getInvoices);

// PDF route - must be defined before /:id to avoid route conflicts
// Express matches routes in order, so more specific routes should come first
router.get('/:id/pdf', downloadInvoicePDF);

// Get single invoice - this must come after /:id/pdf
router.get('/:id', getInvoice);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/status', updateInvoiceStatus);
router.delete('/:id', deleteInvoice);

export default router;

