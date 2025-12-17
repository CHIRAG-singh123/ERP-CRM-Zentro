import { createPortal } from 'react-dom';
import { useEffect, useState, FormEvent } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName?: string;
  onSend: (data: { fromEmail: string; subject: string; message: string }) => Promise<void>;
}

export function EmailModal({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  onSend,
}: EmailModalProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [subject, setSubject] = useState('');
  const [fromEmail, setFromEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    subject?: string;
    fromEmail?: string;
    message?: string;
  }>({});

  const isAdmin = user?.role === 'admin';
  const isEmailDisabled = !isAdmin;

  // Update fromEmail when user changes
  useEffect(() => {
    if (user?.email) {
      setFromEmail(user.email);
    }
  }, [user?.email]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setMessage('');
      setErrors({});
      if (user?.email) {
        setFromEmail(user.email);
      }
    }
  }, [isOpen, user?.email]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!subject.trim()) {
      newErrors.subject = 'Title is required';
    }

    if (!fromEmail.trim()) {
      newErrors.fromEmail = 'Your email is required';
    } else if (!validateEmail(fromEmail)) {
      newErrors.fromEmail = 'Please enter a valid email address';
    }

    if (!message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSend({
        fromEmail: fromEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      success('Email sent successfully!');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email. Please try again.';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl animate-slide-in-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-[#A8DADC]" />
            <h3 className="text-xl font-semibold text-white">Send Email</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Recipient Info */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">To</p>
              <p className="text-sm text-white/80">
                {recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail}
              </p>
            </div>

            {/* Title Field */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-white/70 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (errors.subject) {
                    setErrors((prev) => ({ ...prev, subject: undefined }));
                  }
                }}
                disabled={isLoading}
                className={`w-full rounded-lg border ${
                  errors.subject
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-white/10 bg-white/5'
                } px-4 py-2.5 text-sm text-white placeholder-white/30 transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="Enter email subject"
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-400">{errors.subject}</p>
              )}
            </div>

            {/* Your Email Field */}
            <div>
              <label htmlFor="fromEmail" className="block text-sm font-medium text-white/70 mb-2">
                Your Email <span className="text-red-400">*</span>
                {!isAdmin && (
                  <span className="ml-2 text-xs text-white/50">(Read-only)</span>
                )}
              </label>
              <input
                id="fromEmail"
                type="email"
                value={fromEmail}
                onChange={(e) => {
                  if (isAdmin) {
                    setFromEmail(e.target.value);
                    if (errors.fromEmail) {
                      setErrors((prev) => ({ ...prev, fromEmail: undefined }));
                    }
                  }
                }}
                disabled={isLoading || isEmailDisabled}
                className={`w-full rounded-lg border ${
                  errors.fromEmail
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-white/10 bg-white/5'
                } px-4 py-2.5 text-sm text-white placeholder-white/30 transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isEmailDisabled ? 'cursor-not-allowed' : ''
                }`}
                placeholder="your.email@example.com"
              />
              {errors.fromEmail && (
                <p className="mt-1 text-xs text-red-400">{errors.fromEmail}</p>
              )}
              {!isAdmin && (
                <p className="mt-1 text-xs text-white/50">
                  Only administrators can change the sender email address.
                </p>
              )}
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-white/70 mb-2">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) {
                    setErrors((prev) => ({ ...prev, message: undefined }));
                  }
                }}
                disabled={isLoading}
                rows={8}
                className={`w-full rounded-lg border ${
                  errors.message
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-white/10 bg-white/5'
                } px-4 py-2.5 text-sm text-white placeholder-white/30 transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 focus:outline-none resize-y disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="Enter your message here..."
              />
              {errors.message && (
                <p className="mt-1 text-xs text-red-400">{errors.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-6">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

