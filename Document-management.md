ERP-CRM-Zentro Document Management Restructuring Plan
Executive Summary
This plan outlines a comprehensive restructuring of the Document Management module in the ERP-CRM-Zentro project to emulate Google Drive's core functionality: seamless upload, download, and preview/viewing of diverse file types (e.g., PDF, DOCX, XLSX, PPTX, images, videos) without mandatory backend PDF conversion. The focus is on backend overhaul for scalability, security, and efficiency, while integrating @cyntler/react-doc-viewer on the frontend for native and external rendering.
Key Changes:

Backend: Shift from PDF conversion to temporary signed URLs for private file access. Use cloud storage (e.g., AWS S3 or Firebase) for production-ready scalability; fallback to local Multer if unchanged.
Frontend: Implement react-doc-viewer for previews, handling public/temporary URLs.
Non-Functional: Retain existing CSS; ensure role-based access (RBAC) via Redux auth slices.
Assumptions: Project uses Node.js/Express backend with Multer for uploads (based on repo analysis). No new storage provider unless specified—recommend AWS S3 integration.
Timeline Estimate (for Cursor AI Implementation): 4-6 hours of guided coding sessions.
Success Metrics: Upload/download unchanged; preview works for all supported formats; files remain private with 1-hour TTL signed URLs.

Repo Reference: GitHub - https://github.com/CHIRAG-singh123/ERP-CRM-Zentro 

Current implementation in server/src/controllers/documentController.js relies on PDF conversion via pdf-lib or similar, which fails for non-PDF natives.

Current State Analysis
Based on repo inspection (server/src/):

Upload: Handled in documentController.js via Multer to local ./uploads/ or cloud (if configured). Stores metadata in Document model (fields: name, path, size, userId, type).
Download: Serves files via res.download() or stream from path.
View/Preview: Converts files to PDF backend-side (e.g., using unoconv or libreoffice—not ideal for scale). Endpoint /api/documents/:id/view returns PDF buffer, but fails for complex formats like PPTX due to conversion errors.
Models:Document.js in Mongoose schema lacks fields for mimeType, signedUrlExpiry, storageProvider.
Services: Minimal; logic bloated in controllers.
Pain Points:
Conversion is CPU-intensive, error-prone, and non-real-time.
No support for Office files without public access.
Scalability issues with local storage.


Goals & Non-Goals
Goals

Google Drive Parity: Instant previews for 20+ formats (PDF, DOCX, XLSX, PPTX, images, MP4, etc.) via client-side rendering.
Security: Files private by default; temporary signed URLs (1-hour expiry) for previews.
Performance: No backend conversion; offload to client/external services (MS Office Online/Google Viewer).
Extensibility: Easy addition of sharing, versioning, search.
Integration: Seamless with existing Redux (features/documentsSlice) and auth.

Non-Goals

UI/UX overhaul (keep existing CSS in components/DocumentViewer or similar).
Full Drive features (e.g., collaborative editing, trash bin)—focus on CRUD + preview.
On-prem deployment; assume cloud storage.

High-Level Architecture

Frontend (React + Vite + TS)
├── pages/DocumentsPage.tsx → Lists files (from Redux)
├── components/FilePreview.tsx → <DocViewer> with signed URL
└── features/documentsSlice.ts → Actions: upload, fetch, getSignedUrl

Backend (Node + Express)
├── models/Document.js → Enhanced schema
├── controllers/documentController.js → Routes: upload, download, getSignedUrl
├── services/storageService.js → Abstraction: uploadToS3, generateSignedUrl
└── middleware/auth.js → JWT/RBAC for all endpoints

Storage: Mongo DB (or local fallback) → Private buckets with signed URLs

Backend Restructuring Plan
Implement in phases using Cursor AI's "Apply" mode for file edits and "Chat" for refactoring.
Phase 1: Storage Abstraction (1 hour)

Objective: Decouple storage from controllers for easy S3 migration.
Steps:
Create server/src/services/storageService.js:
Export class StorageService with methods:
upload(fileBuffer, key, mimeType): Returns {key, url} (use Multer fallback; integrate AWS SDK for S3).
generateSignedUrl(key, expiry = 3600): Returns temp public URL (AWS: getSignedUrl; local: proxy endpoint).
delete(key): For future cleanup.

Config: Use .env vars (STORAGE_PROVIDER=s3, AWS_BUCKET, AWS_ACCESS_KEY_ID).

Install deps (run in Cursor terminal): npm i aws-sdk multer (if not present).
Refactor documentController.js:
Replace Multer direct-save with storageService.upload().
Add /api/documents/:id/signed-url endpoint: Fetch doc by ID, call generateSignedUrl(doc.path), update doc with signedUrl (cache 1h).



Phase 2: Model & Schema Enhancements (30 min)

Objective: Add fields for better metadata and signed URL tracking.
Steps:

Update server/src/models/Document.js

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true }, // S3 key or local path
  mimeType: { type: String, required: true }, // e.g., 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  size: { type: Number },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  signedUrl: { type: String }, // Temp URL (expires naturally)
  signedUrlExpiry: { type: Date },
  // Future: sharedWith: [{ userId, permissions: 'view|edit' }]
}, { timestamps: true });


Add index: documentSchema.index({ userId: 1 }); for query perf.
Migrate existing docs (one-time script in Cursor): Add mimeType via fs or file-type lib (npm i file-type).


Phase 3: Controller & Route Overhaul (1 hour)

Objective: Streamline endpoints; remove PDF conversion.
Steps:
Refactor server/src/controllers/documentController.js:
Upload (POST /api/documents): Unchanged logic, but use storageService.upload(); set mimeType from req.file.mimetype.
Download (GET /api/documents/:id/download): Stream from storageService (S3: getObject; local: fs.createReadStream).
List (GET /api/documents): Query by userId, populate metadata (no signed URLs here—generate on-demand).
Delete (DELETE /api/documents/:id): Remove from DB + storageService.delete().
New: Get Signed URL (GET /api/documents/:id/signed-url):
Auth check (user owns doc).
If signedUrlExpiry > now, return existing; else generate new via service, save to doc, return {url, mimeType, name}.

Remove /view endpoint (deprecated).

Secure all routes with existing auth middleware.
Error Handling: Use try-catch; return 404 for invalid IDs, 403 for unauthorized.


Phase 4: Services Layer Expansion (30 min)

Objective: Handle business logic (e.g., validation, notifications).
Steps:
Create server/src/services/documentService.js:
createDocument(data): Validate, save to DB.
getDocumentById(id, userId): Authz check + fetch.
Integrate with storageService.

Move controller logic to services for testability.


Frontend Integration Plan
Leverage existing pages/DocumentsPage.tsx and Redux slice.
Phase 5: Library & Component Setup (45 min)

Objective: Add preview component with signed URL handling.
Steps:
Install: npm i @cyntler/react-doc-viewer (in frontend package.json).


Create src/components/FilePreview.tsx

import React, { useState, useEffect } from 'react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import { useGetSignedUrlQuery } from '../features/documentsApi'; // RTK Query or Axios

interface Props { fileId: string; }
const FilePreview: React.FC<Props> = ({ fileId }) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const { data, isLoading } = useGetSignedUrlQuery(fileId);

  useEffect(() => {
    if (data?.url) {
      setSignedUrl(data.url);
      setFileType(data.mimeType || '');
      setFileName(data.name);
    }
  }, [data]);

  if (isLoading) return <div>Loading preview...</div>;
  if (!signedUrl) return <div>Preview not available.</div>;

  const docs = [{ uri: signedUrl, fileType, fileName }];
  return (
    <div className="h-screen w-full"> {/* Retain your CSS classes */}
      <DocViewer
        documents={docs}
        pluginRenderers={DocViewerRenderers}
        style={{ height: '100%', width: '100%' }}
        config={{
          header: { disableHeader: false, disableFileName: false },
          csvDelimiter: ',', // Defaults
          pdfZoom: { defaultZoom: 1.1, zoomJump: 0.2 }
        }}
      />
    </div>
  );
};
export default FilePreview;


Integrate in pages/DocumentsPage.tsx: On file select, render <FilePreview fileId={selectedId} /> in modal/drawer.


Phase 6: Redux/RTK Integration (30 min)

Objective: Fetch signed URLs via API.
Steps:
In src/features/documentsApi.ts (RTK Query):

export const documentsApi = createApi({
  // ... existing
  endpoints: (builder) => ({
    getSignedUrl: builder.query<{url: string, mimeType: string, name: string}, string>({
      query: (id) => `/documents/${id}/signed-url`,
    }),
  }),
});

Update features/documentsSlice.ts: Add selectFile action to trigger preview.


Security & Best Practices

Authz: Enforce userId ownership in all ops; use compareSync for expiry checks.
Rate Limiting: Add express-rate-limit for signed URL gen (10/min/user).
Validation: Use joi for req bodies; scan uploads for malware (future: ClamAV).
Privacy: Signed URLs auto-expire; log accesses in Document model.
Edge Cases: Handle large files (>100MB) with streams; unsupported formats fallback to download.

Testing & Deployment Plan
Unit/Integration Tests (30 min)

Backend: Jest for controllers/services (e.g., mock S3, test signed URL expiry).
Frontend: React Testing Library for FilePreview (mock API data).
E2E: Cypress for upload → preview flow.

Deployment

Update .env: Add S3 creds.
Migrate DB: Run script to add mimeType to existing docs.
Monitor: Add Winston logging for upload errors.

Cursor AI Implementation Guide

Start Session: Open repo in Cursor; use "Apply Plan" on this MD.
Phase-by-Phase: Chat "Implement Phase 1" → Review diffs → Commit.
Refactors: Use "Refactor" tool for extracting services.
Debug: Test endpoints with Postman; preview in dev server.
Final Review: Run npm test; push to branch feature/doc-restructure.

This plan ensures a robust, Drive-like system. Ping for clarifications!