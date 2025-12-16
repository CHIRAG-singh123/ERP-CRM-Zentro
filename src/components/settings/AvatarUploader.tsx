import { useCallback, useMemo, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Check, ImageOff, Loader2, Upload } from 'lucide-react';

interface AvatarUploaderProps {
  avatarUrl?: string;
  onUpload: (file: File) => Promise<unknown>;
  maxSizeMb?: number;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Helper to construct full avatar URL from relative path
const getAvatarUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Construct full URL from relative path
  const serverBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${serverBase}${url.startsWith('/') ? url : `/${url}`}`;
};

export function AvatarUploader({ avatarUrl, onUpload, maxSizeMb = 5 }: AvatarUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [didUpload, setDidUpload] = useState(false);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const currentAvatar = useMemo(() => preview || getAvatarUrl(avatarUrl) || null, [avatarUrl, preview]);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      setDidUpload(false);
      setPreview(URL.createObjectURL(file));

      try {
        await onUpload(file);
        setDidUpload(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        setPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      const file = acceptedFiles[0];
      handleUpload(file);
    },
    [handleUpload]
  );

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (!fileRejections.length) return;
    const rejection = fileRejections[0];
    const sizeError = rejection.errors.find((e) => e.code === 'file-too-large');
    if (sizeError) {
      setError(`Max file size is ${maxSizeMb}MB`);
      return;
    }
    const typeError = rejection.errors.find((e) => e.code === 'file-invalid-type');
    if (typeError) {
      setError('Only JPG, PNG, or WEBP images are allowed');
      return;
    }
    setError('File was rejected. Please try again with a valid image.');
  }, [maxSizeMb]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_MIME_TYPES.reduce<Record<string, string[]>>((acc, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    maxFiles: 1,
    maxSize: maxSizeBytes,
    multiple: false,
    onDrop,
    onDropRejected,
  });

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/70">Profile picture</label>

      <div
        {...getRootProps()}
        className={`group relative flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-4 transition hover:border-white/20 ${
          isDragActive ? 'border-dashed border-[#B39CD0]' : ''
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/40">
              <ImageOff className="h-6 w-6" />
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {didUpload && !isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-green-400">
              <Check className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 text-sm text-white/80">
          <div className="flex items-center gap-2 font-semibold">
            <Upload className="h-4 w-4 text-[#B39CD0]" />
            <span>{isDragActive ? 'Drop to upload' : 'Drag & drop or click to upload'}</span>
          </div>
          <p className="text-xs text-white/50">
            JPG, PNG, WEBP up to {maxSizeMb}MB. A square image works best for avatars.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

