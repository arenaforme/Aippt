import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideCloseButton?: boolean;  // 隐藏关闭按钮（用于强制弹窗）
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideCloseButton = false,
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // 使用 Portal 将 Modal 渲染到 body，避免层叠上下文问题
  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-200"
        onClick={hideCloseButton ? undefined : onClose}
      />

      {/* 对话框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'relative bg-card rounded-panel shadow-xl w-full transition-all duration-200',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          {title && (
            <div className="flex items-center justify-between px-8 py-6 bg-accent rounded-t-panel">
              <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={24} />
                </button>
              )}
            </div>
          )}

          {/* 内容 */}
          <div className="px-8 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

