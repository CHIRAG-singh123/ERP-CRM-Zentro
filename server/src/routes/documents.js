import express from 'express';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  getDocumentPreviewUrl,
  proxyDocument,
  serveDocument,
  viewDocument,
  generateViewToken,
  servePublicDocument,
  upload,
} from '../controllers/documentController.js';
import { authenticate, authenticateFromQuery } from '../middlewares/auth.js';

const router = express.Router();

// PUBLIC ROUTE - Must be before authenticate middleware
// This allows external viewers (Google Docs, Office Online) to access documents
router.get('/public/:token', servePublicDocument);

// View PDF route - uses query parameter auth to allow opening in new tab
// Must be before the general authenticate middleware
router.get('/:id/view', authenticateFromQuery, viewDocument);

// All routes below require authentication
router.use(authenticate);

router.get('/', getDocuments);
router.get('/:id', getDocument);
router.post('/', upload.single('file'), uploadDocument);
router.post('/:id/view-token', generateViewToken); // Generate temporary public view token (legacy)
router.get('/:id/proxy', proxyDocument); // For external viewers like Office Online (legacy)
router.get('/:id/serve', serveDocument); // For direct inline viewing (legacy)
router.get('/:id/download', downloadDocument);
router.get('/:id/preview', getDocumentPreviewUrl);
router.delete('/:id', deleteDocument);

export default router;

