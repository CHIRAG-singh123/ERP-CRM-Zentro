import { useState } from 'react';
import { File, Download, Trash2, Upload, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttachments, uploadAttachment, deleteAttachment, downloadAttachment } from '../../services/api/attachments';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import type { Attachment } from '../../services/api/attachments';

interface AttachmentListProps {
  type: 'Lead' | 'Deal' | 'Contact' | 'Company' | 'Invoice' | 'Quote' | 'Task';
  id: string;
}

export function AttachmentList({ type, id }: AttachmentListProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['attachments', type, id],
    queryFn: () => getAttachments(type, id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', type, id] });
      success('Attachment deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete attachment');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      await uploadAttachment(type, id, file);
      queryClient.invalidateQueries({ queryKey: ['attachments', type, id] });
      success('File uploaded successfully');
      setShowUpload(false);
    } catch (err) {
      error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      await downloadAttachment(attachment._id, attachment.originalName);
      success('File downloaded successfully');
    } catch (err) {
      error('Failed to download file');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      deleteMutation.mutate(attachmentId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const attachments = data?.attachments || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Attachments</h3>
        {!showUpload ? (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-md bg-[#A8DADC] px-3 py-1.5 text-sm font-medium text-[#1A1A1C] hover:bg-[#BCE7E5]"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-[#1A1A1C] px-3 py-1.5 text-sm text-white/70 hover:bg-white/5">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Select File'}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
              />
            </label>
            <button
              onClick={() => setShowUpload(false)}
              className="rounded-md p-1.5 text-white/70 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-white/60">Loading attachments...</div>
      ) : attachments.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-[#1A1A1C]/50 p-4 text-center text-sm text-white/60">
          No attachments yet
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-center justify-between rounded-md border border-white/10 bg-[#1A1A1C]/50 p-3"
            >
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-white/60" />
                <div>
                  <div className="text-sm font-medium text-white">{attachment.originalName}</div>
                  <div className="text-xs text-white/60">
                    {formatFileSize(attachment.size)} •{' '}
                    {new Date(attachment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                {(user?.role === 'admin' || attachment.uploadedBy._id === user?._id) && (
                  <button
                    onClick={() => handleDelete(attachment._id)}
                    className="rounded-md p-2 text-red-400 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

