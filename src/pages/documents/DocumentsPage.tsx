import { useState } from 'react';
import { FilePlus, Search, Filter, X, Shield, Loader2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useDocuments, useDeleteDocument, useDownloadDocument } from '../../hooks/queries/useDocuments';
import { DocumentUploader } from '../../components/documents/DocumentUploader';
import { DocumentGrid } from '../../components/documents/DocumentGrid';
import { DocumentList } from '../../components/documents/DocumentList';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import { ViewToggle } from '../../components/documents/ViewToggle';
import type { Document, DocumentFileType } from '../../types/documents';

type ViewMode = 'grid' | 'list';

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<DocumentFileType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'originalName' | 'fileType' | 'size' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUploader, setShowUploader] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data, isLoading, isError, error } = useDocuments({
    search: searchQuery || undefined,
    fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined,
    sortBy,
    sortOrder,
    limit: 100,
  });

  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();

  const documents = data?.documents || [];

  const handleView = (document: Document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const handleDownload = (document: Document) => {
    downloadMutation.mutate({ id: document._id, filename: document.originalName });
  };

  const handleDelete = (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.originalName}"?`)) {
      deleteMutation.mutate(document._id);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field as typeof sortBy);
      setSortOrder('desc');
    }
  };

  const handleUploadComplete = () => {
    // Optionally close uploader after successful upload
    // setShowUploader(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Manage your Word, PowerPoint, and Excel documents with secure storage and easy access."
        actions={
          <div className="flex items-center gap-3">
            <ViewToggle onViewChange={setViewMode} />
            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A8DADC] to-[#BCE7E5] px-5 py-2.5 text-sm font-semibold text-[#1A1A1C] shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
            >
              <FilePlus className="h-4 w-4" />
              Upload
            </button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="h-5 w-5 text-white/40" />
          </div>
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 px-12 py-3.5 text-sm font-medium text-white placeholder:text-white/40 shadow-lg backdrop-blur-sm transition-all duration-200 focus:border-[#B39CD0]/50 focus:outline-none focus:ring-2 focus:ring-[#B39CD0]/20 hover:border-white/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 px-4 py-2.5 shadow-lg backdrop-blur-sm">
          <Filter className="h-4 w-4 text-white/50" />
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value as DocumentFileType | 'all')}
            className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#1A1A1C]">All Types</option>
            <option value="word" className="bg-[#1A1A1C]">Word</option>
            <option value="powerpoint" className="bg-[#1A1A1C]">PowerPoint</option>
            <option value="excel" className="bg-[#1A1A1C]">Excel</option>
          </select>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C] to-[#242426] p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Upload Documents</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="rounded-lg p-2 text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DocumentUploader onUploadComplete={handleUploadComplete} onClose={() => setShowUploader(false)} />
          </div>
        </div>
      )}

      {/* Documents Content */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/70 to-[#1A1A1C]/50 py-20 shadow-lg">
          <div className="text-center">
            <div className="relative mx-auto mb-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#B39CD0]" />
              <div className="absolute inset-0 mx-auto h-10 w-10 animate-ping rounded-full border-2 border-[#B39CD0]/30"></div>
            </div>
            <p className="text-sm font-medium text-white/80">Loading documents...</p>
            <p className="mt-1 text-xs text-white/50">Please wait</p>
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5 px-8 py-12 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <X className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-red-400">Error Loading Documents</h3>
          <p className="text-sm text-white/70">
            {error instanceof Error ? error.message : 'Failed to load documents'}
          </p>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/70 to-[#1A1A1C]/50 px-8 py-20 text-center shadow-lg">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B39CD0]/20 to-[#B39CD0]/10 shadow-lg">
            <FilePlus className="h-10 w-10 text-[#B39CD0]" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-white">No documents found</h3>
          <p className="mb-8 text-sm text-white/60">
            {searchQuery || fileTypeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by uploading your first document'}
          </p>
          {!searchQuery && fileTypeFilter === 'all' && (
            <button
              onClick={() => setShowUploader(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B39CD0] to-[#BCE7E5] px-6 py-3 text-sm font-semibold text-[#1A1A1C] shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
            >
              <FilePlus className="h-4 w-4" />
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <DocumentGrid
              documents={documents}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ) : (
            <DocumentList
              documents={documents}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          )}

          {/* Pagination Info */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/70 to-[#1A1A1C]/50 px-6 py-4 text-sm font-medium text-white/70 shadow-lg">
              <span>
                Showing <span className="font-semibold text-white">{documents.length}</span> of{' '}
                <span className="font-semibold text-white">{data.pagination.total}</span> documents
              </span>
              <span>
                Page <span className="font-semibold text-white">{data.pagination.page}</span> of{' '}
                <span className="font-semibold text-white">{data.pagination.pages}</span>
              </span>
            </div>
          )}
        </>
      )}

      {/* Document Viewer Modal */}
      {showViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => {
            setShowViewer(false);
            setSelectedDocument(null);
          }}
          onDownload={handleDownload}
        />
      )}

      {/* Governance Info */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-8 text-sm text-white/70 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B39CD0]/20">
            <Shield className="h-5 w-5 text-[#B39CD0]" />
          </div>
          <h3 className="text-base font-semibold uppercase tracking-wider text-white/80">Document Management</h3>
        </div>
        <p className="leading-relaxed text-white/60">
          Secure document storage with tenant isolation. Upload Word, PowerPoint, and Excel files up to 50MB.
          Documents are stored securely and can be viewed directly in your browser using Office Online Viewer.
        </p>
      </section>
    </div>
  );
}
