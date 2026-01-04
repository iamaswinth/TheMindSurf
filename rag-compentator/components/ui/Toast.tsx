'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { XIcon, CheckIcon, AlertCircleIcon } from './Icons';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration (default 5s)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

// Toast Item Component
interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: <CheckIcon size={20} className="text-[#10B981]" />,
    error: <XIcon size={20} className="text-[#EF4444]" />,
    warning: <AlertCircleIcon size={20} className="text-[#F59E0B]" />,
    info: <AlertCircleIcon size={20} className="text-[#3B82F6]" />,
  };

  const backgrounds = {
    success: 'border-l-[#10B981]',
    error: 'border-l-[#EF4444]',
    warning: 'border-l-[#F59E0B]',
    info: 'border-l-[#3B82F6]',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-[#E5E7EB] border-l-4 ${backgrounds[toast.type]} p-4 min-w-[300px] max-w-md animate-slideInRight`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1F2937]">{toast.title}</p>
          {toast.message && (
            <p className="text-sm text-[#6B7280] mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-[#9CA3AF] hover:text-[#6B7280] rounded transition-colors"
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}

export default ToastProvider;
