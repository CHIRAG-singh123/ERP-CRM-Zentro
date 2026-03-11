import express from 'express';
import { createReceipt } from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/receipt', createReceipt);

export default router;
