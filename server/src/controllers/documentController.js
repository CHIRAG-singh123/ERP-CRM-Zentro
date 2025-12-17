import Document from '../models/Document.js';
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler } from '../utils/asyncHandler.js';
import multer from 'multer';
import { validateFile, getFileType, formatFileSize } from '../utils/documentUtils.js';
import { convertToPDF, getPDFOutputPath, getConversionSupport } from '../utils/pdfConverter.js';
import mongoose from 'mongoose';

// Helper function to check if user can access document (owner or admin)
const canAccessDocument = (document, user) => {
  // Admin can access any document
  if (user.role === 'admin') {
    console.log(`[Access] Admin access granted for document: ${document._id}`);
    return true;
  }
  
  // Check if user is the document owner
  const isOwner = document.uploadedBy.toString() === user._id.toString();
  console.log(`[Access] User ${user._id} is owner: ${isOwner}, Document owner: ${document.uploadedBy}`);
  
  return isOwner;
};

// Helper function to find document by ID only (simpler approach)
const findDocumentById = async (documentId) => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    console.error(`[Query] Invalid document ID format: ${documentId}`);
    return null;
  }
  
  return Document.findById(documentId);
};

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads', 'documents');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch((error) => cb(error, null));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (!validateFile(file.originalname, file.mimetype)) {
      return cb(
        new Error(
          'Invalid file type. Only Word (.doc, .docx), PowerPoint (.ppt, .pptx), and Excel (.xls, .xlsx) files are allowed.'
        )
      );
    }
    cb(null, true);
  },
});

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private - Users see only their own documents, Admin sees all
export const getDocuments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, fileType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  console.log(`[GetDocuments] User: ${req.user._id}, Role: ${req.user.role}`);

  const query = {};
  
  // Ownership filter - users see only their own documents, admin sees all
  if (req.user.role !== 'admin') {
    query.uploadedBy = req.user._id;
  }

  // Filter by file type
  if (fileType && ['word', 'powerpoint', 'excel'].includes(fileType)) {
    query.fileType = fileType;
  }

  // Search by filename
  if (search) {
    query.originalName = { $regex: search, $options: 'i' };
  }

  // Sort options
  const sort = {};
  const validSortFields = ['originalName', 'fileType', 'size', 'createdAt', 'updatedAt'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  sort[sortField] = sortOrder === 'asc' ? 1 : -1;

  // Pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  console.log(`[GetDocuments] Query:`, JSON.stringify(query, null, 2));

  const documents = await Document.find(query)
    .populate('uploadedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await Document.countDocuments(query);

  console.log(`[GetDocuments] Found ${documents.length} documents out of ${total} total`);

  res.json({
    documents,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private - Owner or Admin only
export const getDocument = asyncHandler(async (req, res) => {
  console.log(`[GetDocument] Fetching document: ${req.params.id}`);
  console.log(`[GetDocument] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[GetDocument] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can view details
  if (!canAccessDocument(document, req.user)) {
    console.error(`[GetDocument] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to view this document' });
  }

  // Populate uploader info
  await document.populate('uploadedBy', 'name email');

  console.log(`[GetDocument] Found document: ${document.originalName}`);
  res.json({ document });
});

// @desc    Upload document (converts to PDF)
// @route   POST /api/documents
// @access  Private
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { description, tags } = req.body;
  const fileType = getFileType(req.file.originalname);

  if (!fileType) {
    // Delete uploaded file if invalid
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error('Error deleting invalid file:', error);
    }
    return res.status(400).json({ error: 'Invalid file type' });
  }

  console.log(`[Upload] Processing file: ${req.file.originalname}`);
  console.log(`[Upload] File type: ${fileType}`);
  console.log(`[Upload] Original path: ${req.file.path}`);

  // Store original file info
  const originalFilename = req.file.filename;
  const originalMimeType = req.file.mimetype;
  const originalSize = req.file.size;
  const originalPath = req.file.path;

  // Generate PDF output path
  const pdfFilename = path.basename(originalFilename, path.extname(originalFilename)) + '.pdf';
  const pdfPath = path.join(path.dirname(originalPath), pdfFilename);

  try {
    // Convert to PDF
    console.log(`[Upload] Converting to PDF: ${pdfPath}`);
    await convertToPDF(originalPath, pdfPath, fileType);
    console.log(`[Upload] PDF conversion successful`);

    // Get PDF file stats
    const pdfStats = await fs.stat(pdfPath);
    console.log(`[Upload] PDF size: ${pdfStats.size} bytes`);

    // Delete original file after successful conversion
    try {
      await fs.unlink(originalPath);
      console.log(`[Upload] Original file deleted: ${originalPath}`);
    } catch (deleteError) {
      console.error('[Upload] Error deleting original file:', deleteError);
      // Continue even if deletion fails
    }

    // Create document record with PDF info
    const document = await Document.create({
      filename: pdfFilename,
      originalName: req.file.originalname, // Keep original name for display
      originalFilename: originalFilename,
      mimeType: 'application/pdf',
      originalMimeType: originalMimeType,
      size: pdfStats.size,
      originalSize: originalSize,
      path: `/uploads/documents/${pdfFilename}`,
      fileType,
      description: description || '',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
      uploadedBy: req.user._id,
      tenantId: req.user.tenantId,
      isConverted: true,
    });

    const populated = await Document.findById(document._id).populate('uploadedBy', 'name email');

    console.log(`[Upload] Document created: ${document._id}`);
    res.status(201).json({ document: populated });

  } catch (conversionError) {
    console.error('[Upload] PDF conversion failed:', conversionError);
    
    // Clean up original file on conversion failure
    try {
      await fs.unlink(originalPath);
    } catch (cleanupError) {
      console.error('[Upload] Error cleaning up original file:', cleanupError);
    }

    // Also try to clean up any partial PDF file
    try {
      await fs.unlink(pdfPath);
    } catch (cleanupError) {
      // PDF might not exist, ignore error
    }

    return res.status(500).json({ 
      error: 'Failed to convert document to PDF. Please try again or contact support.',
      details: conversionError.message 
    });
  }
});

// @desc    View document as PDF in browser
// @route   GET /api/documents/:id/view
// @access  Private - Owner or Admin only
export const viewDocument = asyncHandler(async (req, res) => {
  console.log(`[View] Request for document: ${req.params.id}`);
  console.log(`[View] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[View] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can view
  if (!canAccessDocument(document, req.user)) {
    console.error(`[View] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to view this document' });
  }

  // Construct file path - document.path is like "/uploads/documents/filename.pdf"
  const relativePath = document.path.startsWith('/') ? document.path.slice(1) : document.path;
  const filePath = path.join(process.cwd(), 'server', relativePath);
  console.log(`[View] Document: ${document.originalName}`);
  console.log(`[View] PDF path: ${filePath}`);

  try {
    await fs.access(filePath);
    console.log(`[View] PDF file exists, serving for inline viewing`);
    
    // Get the display filename (change extension to .pdf for clarity)
    const displayName = document.originalName.replace(/\.[^/.]+$/, '') + '.pdf';
    
    // Use res.sendFile for reliable file serving
    res.sendFile(filePath, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(displayName)}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    }, (error) => {
      if (error) {
        console.error(`[View] Error sending file:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error serving PDF file' });
        }
      } else {
        console.log(`[View] PDF served successfully`);
      }
    });
  } catch (error) {
    console.error(`[View] File access error:`, error);
    res.status(404).json({ error: 'PDF file not found on server' });
  }
});

// @desc    Proxy document for Office Online Viewer (legacy - kept for backward compatibility)
// @route   GET /api/documents/:id/proxy
// @access  Private - Owner or Admin only
export const proxyDocument = asyncHandler(async (req, res) => {
  console.log(`[Proxy] Request for document: ${req.params.id}`);
  console.log(`[Proxy] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[Proxy] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can access
  if (!canAccessDocument(document, req.user)) {
    console.error(`[Proxy] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to view this document' });
  }

  // Construct file path - document.path is like "/uploads/documents/filename.ext"
  const relativePath = document.path.startsWith('/') ? document.path.slice(1) : document.path;
  const filePath = path.join(process.cwd(), 'server', relativePath);
  console.log(`[Proxy] Document: ${document.originalName}`);
  console.log(`[Proxy] File path: ${filePath}`);

  try {
    await fs.access(filePath);
    console.log(`[Proxy] File exists, sending file`);
    
    // Use res.sendFile for reliable file serving
    res.sendFile(filePath, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.originalName)}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=3600',
      },
    }, (error) => {
      if (error) {
        console.error(`[Proxy] Error sending file:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error reading file' });
        }
      } else {
        console.log(`[Proxy] File sent successfully`);
      }
    });
  } catch (error) {
    console.error(`[Proxy] File access error:`, error);
    res.status(404).json({ error: 'File not found on server' });
  }
});

// @desc    Download document (as PDF)
// @route   GET /api/documents/:id/download
// @access  Private - Owner or Admin only
export const downloadDocument = asyncHandler(async (req, res) => {
  console.log(`[Download] Request for document: ${req.params.id}`);
  console.log(`[Download] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[Download] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can download
  if (!canAccessDocument(document, req.user)) {
    console.error(`[Download] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to download this document' });
  }

  // Construct file path
  const relativePath = document.path.startsWith('/') ? document.path.slice(1) : document.path;
  const filePath = path.join(process.cwd(), 'server', relativePath);
  
  // Create download filename - use original name but with .pdf extension
  const downloadName = document.originalName.replace(/\.[^/.]+$/, '') + '.pdf';
  
  console.log(`[Download] Document: ${document.originalName}`);
  console.log(`[Download] Download as: ${downloadName}`);
  console.log(`[Download] File path: ${filePath}`);

  try {
    await fs.access(filePath);
    console.log(`[Download] File exists, initiating download`);
    
    // Use res.download() - simple and reliable
    res.download(filePath, downloadName, (error) => {
      if (error) {
        console.error(`[Download] Error downloading file:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      } else {
        console.log(`[Download] File downloaded successfully`);
      }
    });
  } catch (error) {
    console.error(`[Download] File access error:`, error);
    res.status(404).json({ error: 'File not found on server' });
  }
});

// @desc    Get document preview URL
// @route   GET /api/documents/:id/preview
// @access  Private - Owner or Admin only
export const getDocumentPreviewUrl = asyncHandler(async (req, res) => {
  console.log(`[Preview] Request for document: ${req.params.id}`);
  console.log(`[Preview] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[Preview] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can get preview
  if (!canAccessDocument(document, req.user)) {
    console.error(`[Preview] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to view this document' });
  }

  // For local development, Office Online Viewer won't work (needs public URL)
  // Return both the Office viewer URL and a direct file URL for fallback
  const baseUrl = process.env.API_BASE_URL || process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`;
  const serveUrl = `${baseUrl}/api/documents/${document._id}/serve`;
  
  console.log(`[Preview] Document: ${document.originalName}`);
  console.log(`[Preview] Serve URL: ${serveUrl}`);

  res.json({ 
    // For local development, we provide a direct serve URL 
    // External viewers (Office/Google) won't work on localhost
    fileUrl: serveUrl,
    document: {
      _id: document._id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      fileType: document.fileType,
      size: document.size
    }
  });
});

// @desc    Serve document directly (inline view)
// @route   GET /api/documents/:id/serve
// @access  Private - Owner or Admin only
export const serveDocument = asyncHandler(async (req, res) => {
  console.log(`[Serve] Request for document: ${req.params.id}`);
  console.log(`[Serve] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[Serve] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can serve
  if (!canAccessDocument(document, req.user)) {
    console.error(`[Serve] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to view this document' });
  }

  const relativePath = document.path.startsWith('/') ? document.path.slice(1) : document.path;
  const filePath = path.join(process.cwd(), 'server', relativePath);
  
  console.log(`[Serve] Document: ${document.originalName}`);
  console.log(`[Serve] File path: ${filePath}`);

  try {
    await fs.access(filePath);
    
    // Set headers for inline viewing
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Send the file
    res.sendFile(filePath, (error) => {
      if (error) {
        console.error(`[Serve] Error sending file:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error serving file' });
        }
      } else {
        console.log(`[Serve] File served successfully`);
      }
    });
  } catch (error) {
    console.error(`[Serve] File access error:`, error);
    res.status(404).json({ error: 'File not found on server' });
  }
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private - Owner or Admin only
export const deleteDocument = asyncHandler(async (req, res) => {
  console.log(`[Delete] Request for document: ${req.params.id}`);
  console.log(`[Delete] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[Delete] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can delete
  if (!canAccessDocument(document, req.user)) {
    console.error(`[Delete] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to delete this document' });
  }

  // Delete file from filesystem
  try {
    const relativePath = document.path.startsWith('/') ? document.path.slice(1) : document.path;
    const filePath = path.join(process.cwd(), 'server', relativePath);
    console.log(`[Delete] Deleting file: ${filePath}`);
    await fs.unlink(filePath);
    console.log(`[Delete] File deleted successfully`);
  } catch (error) {
    console.error('[Delete] Error deleting file:', error);
    // Continue with database deletion even if file deletion fails
  }

  await Document.findByIdAndDelete(document._id);
  console.log(`[Delete] Document deleted from database`);

  res.json({ message: 'Document deleted successfully' });
});

// @desc    Generate a temporary view token for a document
// @route   POST /api/documents/:id/view-token
// @access  Private - Owner or Admin only
export const generateViewToken = asyncHandler(async (req, res) => {
  console.log(`[ViewToken] Request for document: ${req.params.id}`);
  console.log(`[ViewToken] User: ${req.user._id}, Role: ${req.user.role}`);
  
  const document = await findDocumentById(req.params.id);

  if (!document) {
    console.error(`[ViewToken] Document not found: ${req.params.id}`);
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check ownership - only owner or admin can generate token
  if (!canAccessDocument(document, req.user)) {
    console.error(`[ViewToken] Access denied. User ${req.user._id} is not owner of document ${document._id}`);
    return res.status(403).json({ error: 'You do not have permission to access this document' });
  }

  // Generate a new view token (valid for 30 minutes)
  const token = document.generateViewToken(30);
  await document.save();

  // Build the public view URL
  const baseUrl = process.env.API_BASE_URL || process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`;
  const publicViewUrl = `${baseUrl}/api/documents/public/${token}`;

  console.log(`[ViewToken] Generated token for document: ${document.originalName}`);
  console.log(`[ViewToken] Public URL: ${publicViewUrl}`);

  res.json({
    viewToken: token,
    publicViewUrl,
    expiresAt: document.viewTokenExpires,
    document: {
      _id: document._id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      fileType: document.fileType,
    },
  });
});

// @desc    Serve document publicly using view token (for external viewers)
// @route   GET /api/documents/public/:token
// @access  Public (with valid temporary token)
export const servePublicDocument = asyncHandler(async (req, res) => {
  const { token } = req.params;
  console.log(`[PublicServe] Request with token: ${token?.substring(0, 8)}...`);

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Find document by view token
  const document = await Document.findByViewToken(token);

  if (!document) {
    console.error(`[PublicServe] Invalid or expired token`);
    return res.status(404).json({ error: 'Document not found or token expired' });
  }

  const relativePath = document.path.startsWith('/') ? document.path.slice(1) : document.path;
  const filePath = path.join(process.cwd(), 'server', relativePath);
  
  console.log(`[PublicServe] Document: ${document.originalName}`);
  console.log(`[PublicServe] File path: ${filePath}`);

  try {
    await fs.access(filePath);
    
    // Set headers for inline viewing
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=1800'); // 30 minutes cache
    // Allow cross-origin access for external viewers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Send the file
    res.sendFile(filePath, (error) => {
      if (error) {
        console.error(`[PublicServe] Error sending file:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error serving file' });
        }
      } else {
        console.log(`[PublicServe] File served successfully`);
      }
    });
  } catch (error) {
    console.error(`[PublicServe] File access error:`, error);
    res.status(404).json({ error: 'File not found on server' });
  }
});

