/**
 * 通知页面 - 显示所有通知
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { getNotifications, markNotificationsRead } from '@/api/endpoints';
import { Markdown, Loading } from '@/components/shared';
import type { Notification } from '@/types';

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await getNotifications();
        if (response.success && response.data) {
          setNotifications(response.data.notifications);
        }
        // 标记已读
        await markNotificationsRead();
      } catch (error) {
        console.error('加载通知失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-banana-600" />
          <h1 className="text-2xl font-bold text-gray-900">通知</h1>
        </div>

        {/* 通知列表 */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            暂无通知
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(
                    expandedId === notification.id ? null : notification.id
                  )}
                  className="w-full px-6 py-4 flex items-center justify-between
                    hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{notification.title}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(notification.created_at + 'Z').toLocaleDateString()}
                  </span>
                </button>
                {expandedId === notification.id && (
                  <div className="px-6 py-4 border-t bg-gray-50">
                    <Markdown>{notification.content}</Markdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
