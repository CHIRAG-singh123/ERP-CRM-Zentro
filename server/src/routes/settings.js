import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/rbac.js';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../controllers/settingsController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Team routes
router.get('/teams', getTeams);
router.get('/teams/:id', getTeam);
router.post('/teams', createTeam);
router.put('/teams/:id', updateTeam);
router.delete('/teams/:id', deleteTeam);

export default router;
