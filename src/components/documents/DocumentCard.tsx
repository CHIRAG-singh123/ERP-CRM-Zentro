import { Download, Trash2, Eye, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import type { Document } from '../../types/documents';

interface DocumentCardProps {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
}

const getFileIcon = (fileType: Document['fileType']) => {
  switch (fileType) {
    case 'word':
      return '📄';
    case 'powerpoint':
      return '📊';
    case 'excel':
      return '📈';
    default:
      return '📄';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export function DocumentCard({ document, onView, onDownload, onDelete }: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-5 shadow-lg transition-all duration-300 hover:border-[#B39CD0]/40 hover:shadow-xl hover:shadow-[#B39CD0]/10 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* File Icon and Header */}
      <div className="relative mb-4 flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B39CD0]/20 to-[#B39CD0]/10 text-3xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-[#B39CD0]/20">
            {getFileIcon(document.fileType)}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="mb-1 truncate text-sm font-semibold text-white transition-colors duration-200 group-hover:text-[#B39CD0]">
              {document.originalName}
            </h3>
            <span className="inline-block rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium capitalize text-white/70">
              {document.fileType}
            </span>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-lg p-2 text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-48 animate-fade-in rounded-xl border border-white/10 bg-[#1A1A1C] py-2 shadow-2xl backdrop-blur-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(document);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Eye className="h-4 w-4 text-[#B39CD0]" />
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(document);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Download className="h-4 w-4 text-white/60" />
                  Download
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(document);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="relative space-y-2.5 rounded-lg bg-white/5 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Size</span>
          <span className="text-xs font-semibold text-white/80">{formatFileSize(document.size)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Uploaded</span>
          <span className="text-xs font-semibold text-white/80">{formatDate(document.createdAt)}</span>
        </div>
        {document.uploadedBy && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">By</span>
            <span className="truncate text-xs font-semibold text-white/80">{document.uploadedBy.name}</span>
          </div>
        )}
      </div>

      {/* Quick Actions (shown on hover) */}
      <div
        className={`absolute inset-x-0 bottom-0 flex gap-2 rounded-b-2xl border-t border-white/10 bg-gradient-to-t from-[#1A1A1C] to-[#1A1A1C]/95 p-3 backdrop-blur-sm transition-all duration-300 ${
          isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(document);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#B39CD0]/20 px-3 py-2 text-xs font-semibold text-[#B39CD0] transition-all duration-200 hover:bg-[#B39CD0]/30 hover:scale-105 active:scale-95"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(document);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>
    </div>
  );
}
