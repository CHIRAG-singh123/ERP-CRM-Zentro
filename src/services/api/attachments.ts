import { fetchJson } from './http';

export interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  relatedTo: {
    type: 'Lead' | 'Deal' | 'Contact' | 'Company' | 'Invoice' | 'Quote' | 'Task';
    id: string;
  };
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentsResponse {
  attachments: Attachment[];
}

export const getAttachments = async (type: string, id: string): Promise<AttachmentsResponse> => {
  return fetchJson<AttachmentsResponse>(`/attachments/${type}/${id}`);
};

export const uploadAttachment = async (
  type: string,
  id: string,
  file: File
): Promise<{ attachment: Attachment }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('id', id);

  return fetchJson<{ attachment: Attachment }>('/attachments', {
    method: 'POST',
    body: formData,
  });
};

export const deleteAttachment = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/attachments/${id}`, {
    method: 'DELETE',
  });
};

export const downloadAttachment = async (id: string, filename: string): Promise<void> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attachments/${id}/download`,
    {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    }
  );
  if (!response.ok) throw new Error('Failed to download attachment');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

