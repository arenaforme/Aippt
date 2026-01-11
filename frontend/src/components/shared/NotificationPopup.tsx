/**
 * NotificationPopup - 通知弹窗组件
 * 用于落地页显示通知弹窗
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { Markdown } from './Markdown';
import { getPopupNotifications } from '@/api/endpoints';
import type { Notification } from '@/types';

interface NotificationPopupProps {
  onClose?: () => void;
}

// 生成通知内容的哈希值，用于判断内容是否更新
const generateContentHash = (notifications: Notification[]): string => {
  const content = notifications.map(n => `${n.id}:${n.updated_at}`).join('|');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

const STORAGE_KEY = 'notification_popup_dismissed';

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载通知数据
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await getPopupNotifications();
        if (response.success && response.data) {
          const { notifications: items, popup_enabled } = response.data;

          if (!popup_enabled || items.length === 0) {
            setLoading(false);
            return;
          }

          // 检查是否已关闭过相同内容的弹窗
          const contentHash = generateContentHash(items);
          const dismissedHash = localStorage.getItem(STORAGE_KEY);

          if (dismissedHash === contentHash) {
            setLoading(false);
            return;
          }

          setNotifications(items);
          setIsVisible(true);
        }
      } catch (error) {
        console.error('加载通知失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    const contentHash = generateContentHash(notifications);
    localStorage.setItem(STORAGE_KEY, contentHash);
    setIsVisible(false);
    onClose?.();
  }, [notifications, onClose]);

  // 切换通知
  const goToPrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const goToNext = () => setCurrentIndex(i => Math.min(notifications.length - 1, i + 1));

  if (loading || !isVisible || notifications.length === 0) {
    return null;
  }

  const current = notifications[currentIndex];
  const hasMultiple = notifications.length > 1;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* 弹窗 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 bg-banana-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-banana-600" />
              <h2 className="text-lg font-semibold text-gray-900">{current.title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* 内容 */}
          <div className="px-6 py-5 min-h-[200px] max-h-[60vh] overflow-y-auto">
            <Markdown>{current.content}</Markdown>
          </div>

          {/* 底部导航（多条通知时显示） */}
          {hasMultiple && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {notifications.length}
              </span>
              <button
                onClick={goToNext}
                disabled={currentIndex === notifications.length - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
