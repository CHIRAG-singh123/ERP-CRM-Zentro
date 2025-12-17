import path from 'path';

/**
 * Allowed file extensions for document uploads (original Office formats)
 */
export const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];

/**
 * Allowed MIME types for document uploads (original Office formats)
 */
export const ALLOWED_MIME_TYPES = [
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

/**
 * Stored file MIME type (all documents are converted to PDF)
 */
export const STORED_MIME_TYPE = 'application/pdf';

/**
 * Stored file extension
 */
export const STORED_EXTENSION = '.pdf';

/**
 * Map file extension to file type
 */
export const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.doc', '.docx'].includes(ext)) {
    return 'word';
  }
  if (['.ppt', '.pptx'].includes(ext)) {
    return 'powerpoint';
  }
  if (['.xls', '.xlsx'].includes(ext)) {
    return 'excel';
  }
  
  return null;
};

/**
 * Validate file extension for upload
 */
export const isValidExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Validate MIME type for upload
 */
export const isValidMimeType = (mimeType) => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

/**
 * Validate file for upload (both extension and MIME type)
 */
export const validateFile = (filename, mimeType) => {
  const validExtension = isValidExtension(filename);
  const validMime = isValidMimeType(mimeType);
  
  return validExtension && validMime;
};

/**
 * Check if a MIME type is a valid stored document type (PDF)
 */
export const isValidStoredMimeType = (mimeType) => {
  return mimeType === STORED_MIME_TYPE;
};

/**
 * Get the PDF filename from an original filename
 * @param {string} originalFilename - Original filename (e.g., "report.docx")
 * @returns {string} - PDF filename (e.g., "report.pdf")
 */
export const getPDFFilename = (originalFilename) => {
  const basename = path.basename(originalFilename, path.extname(originalFilename));
  return `${basename}${STORED_EXTENSION}`;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

