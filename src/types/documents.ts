export type DocumentFileType = 'word' | 'powerpoint' | 'excel';

export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  fileType: DocumentFileType;
  description?: string;
  tags: string[];
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  tenantId?: string;
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

