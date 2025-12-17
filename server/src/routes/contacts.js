import express from 'express';
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  exportContacts,
  sendEmailToContact,
} from '../controllers/contactController.js';
import { authenticate } from '../middlewares/auth.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/export', exportContacts);
router.post('/import', upload.single('file'), importContacts);
router.route('/').get(getContacts).post(createContact);
router.route('/:id').get(getContact).put(updateContact).delete(deleteContact);
router.post('/:id/send-email', sendEmailToContact);

export default router;

