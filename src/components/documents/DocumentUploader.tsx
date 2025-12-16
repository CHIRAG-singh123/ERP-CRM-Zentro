import { Upload, X, Loader2, CheckCircle2, AlertCircle, File } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadDocument } from '../../hooks/queries/useDocuments';

interface DocumentUploaderProps {
  onUploadComplete?: () => void;
  onClose?: () => void;
}

const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['doc', 'docx'].includes(ext || '')) return '📄';
  if (['ppt', 'pptx'].includes(ext || '')) return '📊';
  if (['xls', 'xlsx'].includes(ext || '')) return '📈';
  return '📄';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export function DocumentUploader({ onUploadComplete, onClose }: DocumentUploaderProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const uploadMutation = useUploadDocument();

  // Simulate progress for better UX
  useEffect(() => {
    const interval = setInterval(() => {
      setUploadFiles((prev) =>
        prev.map((f) => {
          if (f.status === 'uploading' && f.progress !== undefined && f.progress < 90) {
            return { ...f, progress: Math.min(f.progress + 5, 90) };
          }
          return f;
        })
      );
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Only Word (.doc, .docx), PowerPoint (.ppt, .pptx), and Excel (.xls, .xlsx) files are allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    return null;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => {
        const error = validateFile(file);
        return {
          file,
          id: Math.random().toString(36).substring(7),
          status: error ? 'error' : 'pending',
          error: error || undefined,
        };
      });

      setUploadFiles((prev) => [...prev, ...newFiles]);

      // Auto-upload valid files
      newFiles.forEach((uploadFile) => {
        if (uploadFile.status === 'pending') {
          handleUpload(uploadFile);
        }
      });
    },
    []
  );

  const handleUpload = async (uploadFile: UploadFile) => {
    setUploadFiles((prev) =>
      prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
    );

    try {
      await uploadMutation.mutateAsync({
        file: uploadFile.file,
      });

      setUploadFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f))
      );

      onUploadComplete?.();
    } catch (error) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      );
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const retryUpload = (uploadFile: UploadFile) => {
    handleUpload(uploadFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const uploadingFiles = uploadFiles.filter((f) => f.status === 'uploading');
  const successFiles = uploadFiles.filter((f) => f.status === 'success');
  const errorFiles = uploadFiles.filter((f) => f.status === 'error');

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 ${
          isDragActive
            ? 'border-[#B39CD0] bg-gradient-to-br from-[#B39CD0]/20 to-[#B39CD0]/10 scale-105 shadow-xl shadow-[#B39CD0]/20'
            : 'border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 hover:border-[#B39CD0]/40 hover:bg-gradient-to-br hover:from-[#1A1A1C] hover:to-[#242426] hover:shadow-lg'
        }`}
      >
        <input {...getInputProps()} />
        <div className="relative">
          <Upload
            className={`h-14 w-14 transition-all duration-300 ${
              isDragActive ? 'text-[#B39CD0] scale-110' : 'text-white/50 group-hover:text-[#B39CD0] group-hover:scale-105'
            }`}
          />
          {isDragActive && (
            <div className="absolute inset-0 animate-ping rounded-full bg-[#B39CD0]/30"></div>
          )}
        </div>
        <p className="mt-6 text-base font-semibold text-white">
          {isDragActive ? 'Drop files here' : 'Drag and drop files here, or click to select'}
        </p>
        <p className="mt-2 text-sm text-white/60">
          Word, PowerPoint, and Excel files only (max {MAX_FILE_SIZE / (1024 * 1024)}MB per file)
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
          <File className="h-3 w-3" />
          <span>Multiple files supported</span>
        </div>
      </div>

      {/* Upload List */}
      {uploadFiles.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Upload Queue</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {uploadFiles.map((uploadFile, index) => (
              <div
                key={uploadFile.id}
                className="group animate-fade-in rounded-xl border border-white/10 bg-gradient-to-br from-[#1A1A1C] to-[#242426] p-4 shadow-lg transition-all duration-200 hover:border-white/20 hover:shadow-xl"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B39CD0]/20 to-[#B39CD0]/10 text-2xl shadow-lg">
                    {getFileIcon(uploadFile.file.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{uploadFile.file.name}</p>
                        <p className="mt-1 text-xs font-medium text-white/60">{formatFileSize(uploadFile.file.size)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadFile.status === 'uploading' && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-[#B39CD0]" />
                            <span className="text-xs font-medium text-white/60">
                              {uploadFile.progress || 0}%
                            </span>
                          </div>
                        )}
                        {uploadFile.status === 'success' && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        )}
                        {uploadFile.status !== 'uploading' && (
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="rounded-lg p-1.5 text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white"
                            aria-label="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-[#B39CD0] to-[#BCE7E5] transition-all duration-300 shadow-lg"
                          style={{ width: `${uploadFile.progress || 0}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {uploadFile.error && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                        <p className="text-xs font-medium text-red-400">{uploadFile.error}</p>
                        {uploadFile.status === 'error' && (
                          <button
                            onClick={() => retryUpload(uploadFile)}
                            className="ml-auto rounded-lg bg-[#B39CD0]/20 px-3 py-1 text-xs font-semibold text-[#B39CD0] transition-all duration-200 hover:bg-[#B39CD0]/30 hover:scale-105 active:scale-95"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}

                    {/* Success Message */}
                    {uploadFile.status === 'success' && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                        <p className="text-xs font-medium text-green-400">Uploaded successfully</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-4 text-sm">
              {successFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-white/80">
                    {successFiles.length} {successFiles.length === 1 ? 'file' : 'files'} uploaded
                  </span>
                </div>
              )}
              {uploadingFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#B39CD0]" />
                  <span className="font-medium text-white/80">
                    {uploadingFiles.length} {uploadingFiles.length === 1 ? 'file' : 'files'} uploading
                  </span>
                </div>
              )}
              {errorFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="font-medium text-white/80">
                    {errorFiles.length} {errorFiles.length === 1 ? 'file' : 'files'} failed
                  </span>
                </div>
              )}
            </div>
            {successFiles.length > 0 && uploadingFiles.length === 0 && (
              <button
                onClick={() => {
                  setUploadFiles([]);
                  onClose?.();
                }}
                className="rounded-xl bg-gradient-to-r from-[#B39CD0] to-[#BCE7E5] px-6 py-2.5 text-sm font-semibold text-[#1A1A1C] shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
