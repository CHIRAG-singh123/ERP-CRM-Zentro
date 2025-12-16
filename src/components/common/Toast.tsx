import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastType } from '../../context/ToastContext';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    textColor: 'text-green-400',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    iconColor: 'text-blue-400',
  },
};

export function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <div
      className={`min-w-[300px] max-w-lg rounded-lg border ${config.borderColor} ${config.bgColor} p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ${
        isVisible ? 'animate-slide-in-right opacity-100' : 'opacity-0 translate-x-full'
      } hover:scale-105 hover:shadow-xl z-[10000]`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${config.iconColor} mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.textColor} break-words whitespace-pre-wrap`}>{message}</p>
        </div>
        <button
          onClick={handleClose}
          className={`shrink-0 rounded p-1 transition-colors hover:bg-white/10 ${config.textColor}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

