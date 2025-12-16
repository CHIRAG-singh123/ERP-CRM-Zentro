import express from 'express';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  importCompanies,
  exportCompanies,
} from '../controllers/companyController.js';
import { authenticate } from '../middlewares/auth.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/export', exportCompanies);
router.post('/import', upload.single('file'), importCompanies);
router.route('/').get(getCompanies).post(createCompany);
router.route('/:id').get(getCompany).put(updateCompany).delete(deleteCompany);

export default router;

