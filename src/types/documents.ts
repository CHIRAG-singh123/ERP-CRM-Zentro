export type DocumentFileType = 'word' | 'powerpoint' | 'excel';

export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  originalFilename?: string; // Original uploaded filename before conversion
  mimeType: string; // Always 'application/pdf' for stored files
  originalMimeType?: string; // Original MIME type before conversion
  size: number; // PDF file size
  originalSize?: number; // Original file size before conversion
  path: string;
  fileType: DocumentFileType; // Original file type (word, powerpoint, excel)
  description?: string;
  tags: string[];
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  tenantId?: string;
  isConverted?: boolean; // Flag indicating if document was converted to PDF
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsListResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DocumentDetailResponse {
  document: Document;
}

export interface UploadDocumentResponse {
  document: Document;
}

export interface DocumentPreviewResponse {
  fileUrl: string;
  document?: {
    _id: string;
    originalName: string;
    mimeType: string;
    fileType: string;
    size: number;
  };
}

export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  fileType?: DocumentFileType;
  sortBy?: 'originalName' | 'fileType' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

