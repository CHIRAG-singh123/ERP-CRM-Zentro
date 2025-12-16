import { X, Download, Loader2, AlertCircle, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  generateViewToken, 
  getGoogleDocsViewerUrl,
  getOfficeOnlineViewerUrl 
} from '../../services/api/documents';
import type { Document } from '../../types/documents';

interface DocumentViewerProps {
  document: Document | null;
  onClose: () => void;
  onDownload?: (document: Document) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
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

const getFileColor = (fileType: string) => {
  switch (fileType) {
    case 'word':
      return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
    case 'powerpoint':
      return 'from-orange-500/20 to-orange-600/10 border-orange-500/30';
    case 'excel':
      return 'from-green-500/20 to-green-600/10 border-green-500/30';
    default:
      return 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
  }
};

export function DocumentViewer({ document, onClose, onDownload }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = { current: 0 };

  useEffect(() => {
    if (!document) {
      setLoading(false);
      setError(null);
      retryCountRef.current = 0;
      return;
    }

    loadPreview();
  }, [document]);

  const loadPreview = () => {
    if (!document) return;
    
    console.log(`[Viewer] Loading document info: ${document._id} - ${document.originalName}`);
    setLoading(false);
    setError(null);
  };

  const handleRetry = () => {
    retryCountRef.current += 1;
    if (retryCountRef.current < 3) {
      loadPreview();
    } else {
      setError('Unable to load preview after multiple attempts.');
    }
  };

  const handleOpenInNewTab = async () => {
    if (!document) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[Viewer] Opening document in new tab: ${document.originalName}`);
      console.log(`[Viewer] File type: ${document.fileType}, MIME: ${document.mimeType}`);
      
      // Generate a temporary public view token
      const tokenResponse = await generateViewToken(document._id);
      console.log(`[Viewer] Generated view token, expires: ${tokenResponse.expiresAt}`);
      
      // Use Google Docs Viewer for Office documents
      // Google Docs Viewer can render Word, Excel, PowerPoint, and PDF files
      const viewerUrl = getGoogleDocsViewerUrl(tokenResponse.publicViewUrl);
      
      console.log(`[Viewer] Opening with Google Docs Viewer: ${viewerUrl}`);
      
      // Open the viewer in a new tab
      const newWindow = window.open(viewerUrl, '_blank');
      
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups for this site to view documents.');
      }
      
    } catch (err) {
      console.error('[Viewer] Failed to open document:', err);
      setError(err instanceof Error ? err.message : 'Failed to open document. Please try downloading instead.');
    } finally {
      setLoading(false);
    }
  };

  // Alternative: Open with Office Online Viewer (for Microsoft files)
  const handleOpenWithOfficeOnline = async () => {
    if (!document) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[Viewer] Opening with Office Online: ${document.originalName}`);
      
      // Generate a temporary public view token
      const tokenResponse = await generateViewToken(document._id);
      
      // Use Office Online Viewer (better for Microsoft Office files)
      const viewerUrl = getOfficeOnlineViewerUrl(tokenResponse.publicViewUrl);
      
      console.log(`[Viewer] Office Online URL: ${viewerUrl}`);
      
      const newWindow = window.open(viewerUrl, '_blank');
      
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      
    } catch (err) {
      console.error('[Viewer] Failed to open with Office Online:', err);
      setError(err instanceof Error ? err.message : 'Failed to open document.');
    } finally {
      setLoading(false);
    }
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative flex h-full w-full flex-col bg-[#1A1A1C] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1A1A1C] to-[#242426] px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${getFileColor(document.fileType)} text-2xl shadow-lg border`}>
              {getFileIcon(document.fileType)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{document.originalName}</h2>
              <p className="text-xs text-white/50 capitalize">{document.fileType} • {formatFileSize(document.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onDownload && (
              <button
                onClick={() => onDownload(document)}
                className="flex items-center gap-2 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5] hover:scale-105 active:scale-95"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto bg-[#0F0F10]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#B39CD0]" />
                  <div className="absolute inset-0 mx-auto h-12 w-12 animate-ping rounded-full border-2 border-[#B39CD0]/30"></div>
                </div>
                <p className="mt-6 text-sm font-medium text-white/80">Loading document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Error Loading Document</h3>
                <p className="mb-6 text-sm text-white/70">{error}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                  {onDownload && (
                    <button
                      onClick={() => onDownload(document)}
                      className="flex items-center gap-2 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5]"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Document Info View - Professional Google Drive style
            <div className="flex min-h-full items-start justify-center p-8 pb-12">
              <div className="w-full max-w-lg">
                <div className={`rounded-2xl bg-gradient-to-br ${getFileColor(document.fileType)} border p-8 mb-6`}>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-7xl mb-4">{getFileIcon(document.fileType)}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">{document.originalName}</h3>
                    <p className="text-sm text-white/60 capitalize">{document.fileType} Document</p>
                  </div>
                </div>

                {/* Document Details */}
                <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10 mb-6">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-white/60">Size</span>
                    <span className="text-sm font-medium text-white">{formatFileSize(document.size)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-white/60">Type</span>
                    <span className="text-sm font-medium text-white capitalize">{document.fileType}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-white/60">MIME Type</span>
                    <span className="text-sm font-medium text-white/80 text-xs">{document.mimeType}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-white/60">Uploaded</span>
                    <span className="text-sm font-medium text-white">
                      {new Date(document.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {document.uploadedBy && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-white/60">Uploaded By</span>
                      <span className="text-sm font-medium text-white">{document.uploadedBy.name}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3 pb-4">
                  {/* Primary Action: View in Browser */}
                  <button
                    onClick={handleOpenInNewTab}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B39CD0] px-6 py-3.5 text-sm font-semibold text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#B39CD0]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                    {loading ? 'Opening...' : 'View in Browser'}
                  </button>

                  {/* Secondary Actions Row */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleOpenWithOfficeOnline}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-[#B39CD0]/30 disabled:opacity-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Office Online
                    </button>
                    
                    {onDownload && (
                      <button
                        onClick={() => onDownload(document)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-[#B39CD0]/30"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-white/40 text-center pt-2">
                    View opens document in Google Docs Viewer. Use Office Online for better Microsoft Office compatibility.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
