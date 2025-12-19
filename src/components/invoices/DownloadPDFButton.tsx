import { Download, Loader2 } from 'lucide-react';
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
    if (!invoiceId) {
      error('Invoice ID is required');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await downloadInvoicePDF(invoiceId);
      
      if (!blob || blob.size === 0) {
        throw new Error('Received empty PDF file');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber || 'invoice'}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup with error handling
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
          if (a.parentNode) {
            document.body.removeChild(a);
          }
        } catch (cleanupError) {
          console.warn('Error during cleanup:', cleanupError);
        }
      }, 100);
      
      success('Invoice PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF download error:', err);
      const errorMessage = err?.message || 'Failed to download invoice PDF';
      error(errorMessage.includes('Failed to download') ? errorMessage : `Failed to download PDF: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      title="Download PDF"
      className="flex items-center justify-center rounded-md border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Download invoice PDF"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}

