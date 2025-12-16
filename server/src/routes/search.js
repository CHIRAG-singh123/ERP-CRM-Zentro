import express from 'express';
import { globalSearch } from '../controllers/searchController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);
router.post('/', globalSearch);

export default router;

