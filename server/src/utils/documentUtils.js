import path from 'path';

/**
 * Allowed file extensions for documents
 */
export const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];

/**
 * Allowed MIME types for documents
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
 * Validate file extension
 */
export const isValidExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Validate MIME type
 */
export const isValidMimeType = (mimeType) => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

/**
 * Validate file (both extension and MIME type)
 */
export const validateFile = (filename, mimeType) => {
  const validExtension = isValidExtension(filename);
  const validMime = isValidMimeType(mimeType);
  
  return validExtension && validMime;
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

