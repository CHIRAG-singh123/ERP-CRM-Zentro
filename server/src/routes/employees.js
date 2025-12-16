import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireEmployeeOrAdmin } from '../middlewares/rbac.js';
import { getMyPerformance, getUsers } from '../controllers/employeeController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(requireEmployeeOrAdmin);

// Performance route
router.get('/me/performance', getMyPerformance);

// Users route (read-only)
router.get('/users', getUsers);

export default router;

