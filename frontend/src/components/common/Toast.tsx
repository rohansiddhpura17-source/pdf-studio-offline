import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useDocumentStore();

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-studio-danger flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-studio-warning flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-studio-primary flex-shrink-0" />,
  };

  return (
    <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-white rounded-lg shadow-popover border border-studio-border text-sm"
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-studio-navy">{toast.title}</p>
              {toast.message && <p className="text-xs text-studio-muted mt-0.5">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-studio-navy p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
