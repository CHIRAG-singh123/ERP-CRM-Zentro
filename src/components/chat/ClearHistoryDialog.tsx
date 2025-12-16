import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ClearHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ClearHistoryDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ClearHistoryDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md flex flex-col rounded-xl border border-white/10 bg-gradient-to-br from-[#1A1A1C] to-[#1A1A1C] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400 animate-pulse" />
            Clear Chat History
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <p className="mb-6 text-white/70">
            Are you sure you want to clear all messages in this chat? This action cannot be undone.
          </p>
        </div>
        <div className="border-t border-white/10 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:from-red-600 hover:to-red-700 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? 'Clearing...' : 'Clear History'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

