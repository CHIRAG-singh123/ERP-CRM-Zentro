import { DocumentCard } from './DocumentCard';
import type { Document } from '../../types/documents';

interface DocumentGridProps {
  documents: Document[];
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
}

export function DocumentGrid({ documents, onView, onDownload, onDelete }: DocumentGridProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/70 to-[#1A1A1C]/50 px-8 py-20 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <svg
            className="h-8 w-8 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/60">No documents found</p>
        <p className="mt-1 text-xs text-white/40">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {documents.map((document, index) => (
        <div
          key={document._id}
          className="animate-fade-in"
          style={{
            animationDelay: `${index * 50}ms`,
            animationFillMode: 'both',
          }}
        >
          <DocumentCard
            document={document}
            onView={onView}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
