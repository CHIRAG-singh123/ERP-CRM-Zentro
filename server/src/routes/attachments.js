import express from 'express';
import {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
  upload,
} from '../controllers/attachmentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:type/:id', getAttachments);
router.post('/', upload.single('file'), uploadAttachment);
router.get('/:id/download', downloadAttachment);
router.delete('/:id', deleteAttachment);

export default router;

