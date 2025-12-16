import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
}: ConfirmDialogProps) {
  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <p className="mb-6 text-white/70">{message}</p>
        </div>
        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                confirmVariant === 'danger'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-[#A8DADC] text-[#1A1A1C] hover:bg-[#BCE7E5]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
