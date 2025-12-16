import { Download } from 'lucide-react';
import { useState } from 'react';
import { downloadInvoicePDF } from '../../services/api/invoices';
import { useToast } from '../../context/ToastContext';

interface DownloadPDFButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function DownloadPDFButton({ invoiceId, invoiceNumber }: DownloadPDFButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { success, error } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadInvoicePDF(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Invoice PDF downloaded successfully');
    } catch (err) {
      error('Failed to download invoice PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {isDownloading ? 'Downloading...' : 'Download PDF'}
    </button>
  );
}

