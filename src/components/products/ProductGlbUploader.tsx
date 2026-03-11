import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Check, Loader2, Upload, X, Box } from 'lucide-react';

interface ProductGlbUploaderProps {
  modelUrl?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => void;
  maxSizeMb?: number;
}

const ACCEPTED_GLB = {
  'model/gltf-binary': ['.glb'],
  'application/octet-stream': ['.glb'],
};

export function ProductGlbUploader({
  modelUrl,
  onUpload,
  onRemove,
  maxSizeMb = 200,
}: ProductGlbUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [didUpload, setDidUpload] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const currentUrl = uploadedUrl || modelUrl;

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      setDidUpload(false);

      try {
        const url = await onUpload(file);
        setUploadedUrl(url);
        setDidUpload(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
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
      handleUpload(acceptedFiles[0]).catch(() => {});
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
        setError('Only .glb (3D model) files are allowed');
        return;
      }
      setError('File was rejected. Please try again with a valid .glb file.');
    },
    [maxSizeMb]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_GLB,
    maxFiles: 1,
    maxSize: maxSizeBytes,
    multiple: false,
    onDrop,
    onDropRejected,
  });

  const handleRemove = useCallback(() => {
    setUploadedUrl(null);
    setDidUpload(false);
    setError(null);
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-white/70">Product 3D Model (optional)</label>

      {currentUrl ? (
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-4 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#B39CD0]/20">
              <Box className="h-6 w-6 text-[#B39CD0]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">3D model (.glb)</p>
              <p className="truncate text-xs text-white/50">
                {currentUrl.split('/').pop() || 'Model uploaded'}
              </p>
            </div>
            {isUploading && (
              <Loader2 className="h-5 w-5 animate-spin text-[#B39CD0]" />
            )}
            {didUpload && !isUploading && (
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                <Check className="h-3 w-3" />
                <span>Uploaded</span>
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
            Remove 3D Model
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-white/10 bg-[#1A1A1C]/70 p-6 transition hover:border-white/20 ${
            isDragActive ? 'border-[#B39CD0] bg-[#1A1A1C]' : ''
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3 text-center">
            {isUploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-[#B39CD0]" />
            ) : (
              <div className="rounded-full bg-[#B39CD0]/10 p-3">
                <Upload className="h-6 w-6 text-[#B39CD0]" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                {isDragActive ? (
                  <span>Drop .glb file here</span>
                ) : (
                  <>
                    <span>Click to upload</span>
                    <span className="text-white/50">or drag and drop</span>
                  </>
                )}
              </div>
              <p className="text-sm text-white/50">
                GLB only, up to {maxSizeMb}MB. For 3D product preview.
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
