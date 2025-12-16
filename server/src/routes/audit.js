import express from 'express';
import { getAuditLogs, getAuditLog } from '../controllers/auditController.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['admin'])[1]); // Use the middleware function from array

router.get('/', getAuditLogs);
router.get('/:id', getAuditLog);

export default router;

