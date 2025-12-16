import Attachment from '../models/Attachment.js';
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler } from '../utils/asyncHandler.js';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads', 'attachments');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch((error) => cb(error, null));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  },
});

// @desc    Get attachments for an entity
// @route   GET /api/attachments/:type/:id
// @access  Private
export const getAttachments = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const query = {
    'relatedTo.type': type,
    'relatedTo.id': id,
  };

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const attachments = await Attachment.find(query)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ attachments });
});

// @desc    Upload attachment
// @route   POST /api/attachments
// @access  Private
export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { type, id } = req.body;

  if (!type || !id) {
    return res.status(400).json({ error: 'Type and ID are required' });
  }

  const attachment = await Attachment.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: `/uploads/attachments/${req.file.filename}`,
    relatedTo: {
      type,
      id,
    },
    uploadedBy: req.user._id,
    tenantId: req.user.tenantId,
  });

  const populated = await Attachment.findById(attachment._id).populate('uploadedBy', 'name email');

  res.status(201).json({ attachment: populated });
});

// @desc    Delete attachment
// @route   DELETE /api/attachments/:id
// @access  Private
export const deleteAttachment = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const attachment = await Attachment.findOne(query);

  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  // Delete file from filesystem
  try {
    const filePath = path.join(process.cwd(), 'server', attachment.path);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Continue with database deletion even if file deletion fails
  }

  await Attachment.findByIdAndDelete(attachment._id);

  res.json({ message: 'Attachment deleted successfully' });
});

// @desc    Download attachment
// @route   GET /api/attachments/:id/download
// @access  Private
export const downloadAttachment = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const attachment = await Attachment.findOne(query);

  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  const filePath = path.join(process.cwd(), 'server', attachment.path);

  try {
    await fs.access(filePath);
    res.download(filePath, attachment.originalName);
  } catch (error) {
    res.status(404).json({ error: 'File not found on server' });
  }
});

