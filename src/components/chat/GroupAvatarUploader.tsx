import { useCallback, useMemo, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Check, ImageOff, Loader2, Upload, X } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

interface GroupAvatarUploaderProps {
  avatarUrl?: string | null;
  onUpload: (file: File) => Promise<unknown>;
  onRemove?: () => void;
  maxSizeMb?: number;
  size?: number;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export function GroupAvatarUploader({ 
  avatarUrl, 
  onUpload, 
  onRemove,
  maxSizeMb = 5,
  size = 120 
}: GroupAvatarUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [didUpload, setDidUpload] = useState(false);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const currentAvatar = useMemo(() => {
    if (preview) return preview;
    if (avatarUrl) return getImageUrl(avatarUrl);
    return null;
  }, [avatarUrl, preview]);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      setDidUpload(false);
      setPreview(URL.createObjectURL(file));

      try {
        await onUpload(file);
        setDidUpload(true);
        setTimeout(() => setDidUpload(false), 2000);
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

  const handleRemove = useCallback(() => {
    if (onRemove) {
      setPreview(null);
      setError(null);
      onRemove();
    }
  }, [onRemove]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-white/70 mb-2">
        Group Profile Picture
      </label>

      <div className="flex items-center gap-4">
        <div
          {...getRootProps()}
          className={`group relative flex-shrink-0 cursor-pointer rounded-full border-2 border-dashed transition-all ${
            isDragActive 
              ? 'border-[#B39CD0] bg-[#B39CD0]/10 scale-105' 
              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
          style={{ width: size, height: size }}
        >
          <input {...getInputProps()} />
          
          <div className="relative w-full h-full rounded-full overflow-hidden bg-white/5">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Group avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            {didUpload && !isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-green-400">
                <Check className="h-6 w-6" />
              </div>
            )}
            {!isUploading && !didUpload && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                <Upload className="h-5 w-5 text-white/0 group-hover:text-white/80 transition-all" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Upload className="h-4 w-4 text-[#B39CD0]" />
            <span className="font-medium">
              {isDragActive ? 'Drop to upload' : 'Click or drag to upload'}
            </span>
          </div>
          <p className="text-xs text-white/50">
            JPG, PNG, WEBP up to {maxSizeMb}MB. Square images work best.
          </p>
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <X className="h-3 w-3" />
              {error}
            </p>
          )}
          {currentAvatar && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Remove avatar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

