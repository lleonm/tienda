'use client';

import { useEffect } from 'react';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <div className="text-5xl mb-2">✅</div>;
      case 'error':
        return <div className="text-5xl mb-2">❌</div>;
      case 'warning':
        return <div className="text-5xl mb-2">⚠️</div>;
      case 'confirm':
        return <div className="text-5xl mb-2">❓</div>;
      default:
        return <div className="text-5xl mb-2">ℹ️</div>;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'confirm':
        return 'border-blue-500';
      default:
        return 'border-gray-500';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 border-t-4 ${getColorClasses()} animate-slideUp`}>
        <div className="p-6 text-center">
          {getIcon()}
          <h2 className="text-2xl font-bold mb-2 text-gray-800">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>

          <div className="flex gap-3 justify-center">
            {type === 'confirm' && (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm?.();
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  {confirmText}
                </button>
              </>
            )}
            {type !== 'confirm' && (
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
