import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: 'bg-emerald-600 text-white shadow-emerald-500/20',
    error: 'bg-rose-600 text-white shadow-rose-500/20',
    info: 'bg-indigo-600 text-white shadow-indigo-500/20'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 mr-3 shrink-0" />,
    info: <Info className="w-5 h-5 mr-3 shrink-0" />
  };

  return (
    <div role="status" aria-live="polite" className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[60] flex items-center rounded-2xl shadow-xl border border-white/10 animate-slide-up backdrop-blur-sm" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
      <div className={`flex w-full items-center px-4 py-3 rounded-2xl text-sm ${styles[type]}`}>
        {icons[type]}
        <span className="text-sm font-semibold">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 p-1 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
