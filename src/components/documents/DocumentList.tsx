import { Eye, Download, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Document } from '../../types/documents';

interface DocumentListProps {
  documents: Document[];
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

type SortField = 'originalName' | 'fileType' | 'size' | 'createdAt';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const SortableHeader = ({
  field,
  label,
  currentSort,
  sortOrder,
  onSort,
}: {
  field: SortField;
  label: string;
  currentSort?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}) => {
  const isActive = currentSort === field;
  return (
    <th className="px-6 py-4 text-left">
      <button
        onClick={() => onSort?.(field)}
        className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50 transition-all duration-200 hover:text-white/80"
      >
        <span>{label}</span>
        <div className="flex flex-col">
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-[#B39CD0]" />
            ) : (
              <ArrowDown className="h-3 w-3 text-[#B39CD0]" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-white/20 group-hover:text-white/40" />
          )}
        </div>
      </button>
    </th>
  );
};

export function DocumentList({
  documents,
  onView,
  onDownload,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
}: DocumentListProps) {
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-gradient-to-r from-white/5 to-white/0">
            <tr>
              <SortableHeader
                field="originalName"
                label="Name"
                currentSort={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                field="fileType"
                label="Type"
                currentSort={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                field="size"
                label="Size"
                currentSort={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Uploaded By
              </th>
              <SortableHeader
                field="createdAt"
                label="Date"
                currentSort={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map((document, index) => (
              <tr
                key={document._id}
                className="group transition-all duration-200 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent"
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 30}ms both`,
                }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#B39CD0]/20 text-xl">
                      {document.fileType === 'word'
                        ? '📄'
                        : document.fileType === 'powerpoint'
                          ? '📊'
                          : '📈'}
                    </div>
                    <span className="text-sm font-semibold text-white transition-colors group-hover:text-[#B39CD0]">
                      {document.originalName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium capitalize text-white/70">
                    {document.fileType}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-white/70">{formatFileSize(document.size)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white/70">{document.uploadedBy?.name || 'Unknown'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white/70">{formatDate(document.createdAt)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(document)}
                      className="action-button action-button-view"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDownload(document)}
                      className="action-button action-button-view"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(document)}
                      className="action-button action-button-delete"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
