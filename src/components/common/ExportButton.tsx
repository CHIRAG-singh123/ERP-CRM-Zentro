import { Download } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';

interface ExportButtonProps {
  onExport: () => Promise<Blob>;
  filename: string;
  label?: string;
}

export function ExportButton({ onExport, filename, label = 'Export' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { success, error } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await onExport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Export completed successfully');
    } catch (err) {
      // Extract detailed error message
      let errorMessage = 'Failed to export';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      // Show detailed error message
      error(errorMessage);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="button-press flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-300 hover:border-white/20 hover:text-white hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="h-4 w-4" />
      {isExporting ? 'Exporting...' : label}
    </button>
  );
}

