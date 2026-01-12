/**
 * 管理员通知管理页面
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Plus, Edit2, Trash2, Eye, EyeOff, MessageSquare } from 'lucide-react';
import {
  adminGetNotifications,
  adminCreateNotification,
  adminUpdateNotification,
  adminDeleteNotification,
  adminGetNotificationSettings,
  adminUpdateNotificationSettings,
} from '@/api/endpoints';
import { Modal, Button, Input, Loading, useToast, useConfirm, Pagination } from '@/components/shared';
import type { Notification } from '@/types';

export const AdminNotifications = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [popupEnabled, setPopupEnabled] = useState(true);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 编辑弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    is_active: true,
    show_in_popup: true,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, settingsRes] = await Promise.all([
        adminGetNotifications({
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        }),
        adminGetNotificationSettings(),
      ]);
      if (notifRes.success && notifRes.data) {
        setNotifications(notifRes.data.notifications);
        setTotal(notifRes.data.total);
      }
      if (settingsRes.success && settingsRes.data) {
        setPopupEnabled(settingsRes.data.popup_enabled);
      }
    } catch (error) {
      show({ message: '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, pageSize]);

  // 分页处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  // 打开新建弹窗
  const handleCreate = () => {
    setEditingId(null);
    setForm({ title: '', content: '', is_active: true, show_in_popup: true, sort_order: 0 });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (notification: Notification) => {
    setEditingId(notification.id);
    setForm({
      title: notification.title,
      content: notification.content,
      is_active: notification.is_active,
      show_in_popup: notification.show_in_popup,
      sort_order: notification.sort_order,
    });
    setShowModal(true);
  };

  // 保存通知
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      show({ message: '标题和内容不能为空', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await adminUpdateNotification(editingId, form);
        if (res.success) {
          show({ message: '更新成功', type: 'success' });
          loadData();
        }
      } else {
        const res = await adminCreateNotification(form);
        if (res.success) {
          show({ message: '创建成功', type: 'success' });
          loadData();
        }
      }
      setShowModal(false);
    } catch (error: any) {
      show({ message: error?.response?.data?.error || '操作失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 删除通知
  const handleDelete = (id: string) => {
    confirm(
      '确定要删除这条通知吗？此操作不可恢复。',
      async () => {
        try {
          await adminDeleteNotification(id);
          show({ message: '删除成功', type: 'success' });
          loadData();
        } catch (error) {
          show({ message: '删除失败', type: 'error' });
        }
      },
      { title: '确认删除', confirmText: '删除', cancelText: '取消', variant: 'danger' }
    );
  };

  // 切换弹窗开关
  const handleTogglePopup = async () => {
    try {
      await adminUpdateNotificationSettings({ popup_enabled: !popupEnabled });
      setPopupEnabled(!popupEnabled);
      show({ message: '设置已更新', type: 'success' });
    } catch (error) {
      show({ message: '更新失败', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        {/* 标题和操作 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-banana-600" />
            <h1 className="text-2xl font-bold text-gray-900">通知管理</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* 弹窗开关 */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={popupEnabled}
                onChange={handleTogglePopup}
                className="w-4 h-4 rounded"
              />
              启用落地页弹窗
            </label>
            <Button variant="primary" onClick={handleCreate}>
              <Plus size={16} className="mr-1" />
              新建通知
            </Button>
          </div>
        </div>

        {/* 通知列表 */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            暂无通知，点击"新建通知"创建第一条通知
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">标题</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">弹窗</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">排序</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{n.title}</td>
                    <td className="px-4 py-3 text-center">
                      {n.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Eye size={14} /> 启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <EyeOff size={14} /> 禁用
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {n.show_in_popup ? (
                        <MessageSquare size={16} className="inline text-banana-600" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">{n.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(n)}
                        className="p-1 text-gray-500 hover:text-banana-600"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1 text-gray-500 hover:text-red-600 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              className="p-4 border-t"
            />
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑通知' : '新建通知'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="标题"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="请输入通知标题"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容（支持 Markdown）
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="请输入通知内容..."
              rows={8}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-banana-500"
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              启用通知
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.show_in_popup}
                onChange={(e) => setForm(prev => ({ ...prev, show_in_popup: e.target.checked }))}
              />
              显示在弹窗
            </label>
          </div>
          <Input
            label="排序（数字越小越靠前）"
            type="number"
            value={form.sort_order.toString()}
            onChange={(e) => setForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};
