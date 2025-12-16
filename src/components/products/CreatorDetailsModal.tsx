import { X, User, Mail, Briefcase, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { UserAvatar } from '../common/UserAvatar';
import type { Product } from '../../types/products';

interface CreatorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Product['createdBy'] | null;
}

export function CreatorDetailsModal({ isOpen, onClose, creator }: CreatorDetailsModalProps) {
  // Body scroll lock
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

  const isCreatorUnknown = !creator || !creator._id || !creator.name || !creator.email;

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
      <div
        className="flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl animate-slide-in-up"
        style={{ height: '900px', width: '400px', maxHeight: '900px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">Creator Details</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors duration-200 hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {isCreatorUnknown ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-full rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-400 mb-2">Creator Information Unavailable</h3>
                    <p className="text-sm text-red-400/90">
                      Creator information is not available. The product creator may have been deleted or the information is missing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center gap-4 pt-4">
                <UserAvatar
                  avatarUrl={creator.profile?.avatar}
                  name={creator.name}
                  email={creator.email}
                  size={72}
                />
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white">{creator.name}</h3>
                  {creator.email && (
                    <p className="text-sm text-white/60 mt-1">{creator.email}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4 border-t border-white/10 pt-6">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-white/50 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Name</p>
                    <p className="text-sm font-medium text-white">{creator.name || 'N/A'}</p>
                  </div>
                </div>

                {creator.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 text-white/50 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Email</p>
                      <p className="text-sm font-medium text-white">{creator.email}</p>
                    </div>
                  </div>
                )}

                {creator._id && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="mt-0.5 h-5 w-5 text-white/50 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">User ID</p>
                      <p className="text-sm font-medium text-white font-mono">{creator._id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

