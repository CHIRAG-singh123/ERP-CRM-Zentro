import { useCallback, useMemo, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

interface ProductImageUploaderProps {
  imageUrl?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => void;
  maxSizeMb?: number;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export function ProductImageUploader({
  imageUrl,
  onUpload,
  onRemove,
  maxSizeMb = 10,
}: ProductImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [didUpload, setDidUpload] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const currentImage = useMemo(
    () => preview || getImageUrl(uploadedUrl || imageUrl) || null,
    [imageUrl, preview, uploadedUrl]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      setDidUpload(false);
      setPreview(URL.createObjectURL(file));

      try {
        const url = await onUpload(file);
        setUploadedUrl(url);
        setDidUpload(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        setPreview(null);
        throw err;
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
      handleUpload(file).catch(() => {
        // Error already handled in handleUpload
      });
    },
    [handleUpload]
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
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
    },
    [maxSizeMb]
  );

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
    setPreview(null);
    setUploadedUrl(null);
    setDidUpload(false);
    setError(null);
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-white/70">Product Image *</label>

      {currentImage ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-white/10 bg-white/5">
            <img
              src={currentImage}
              alt="Product preview"
              className="h-full w-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            {didUpload && !isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
                  <Check className="h-3 w-3" />
                  <span>Uploaded</span>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Remove Image
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-white/10 bg-[#1A1A1C]/70 p-8 transition hover:border-white/20 ${
            isDragActive ? 'border-[#B39CD0] bg-[#1A1A1C]' : ''
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3 text-center">
            {isUploading ? (
              <Loader2 className="h-12 w-12 animate-spin text-[#B39CD0]" />
            ) : (
              <div className="rounded-full bg-[#B39CD0]/10 p-4">
                <Upload className="h-8 w-8 text-[#B39CD0]" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                {isDragActive ? (
                  <>
                    <span>Drop image here</span>
                  </>
                ) : (
                  <>
                    <span>Click to upload</span>
                    <span className="text-white/50">or drag and drop</span>
                  </>
                )}
              </div>
              <p className="text-sm text-white/50">
                JPG, PNG, WEBP up to {maxSizeMb}MB. Recommended: 800x800px or larger.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

