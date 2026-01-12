/**
 * 用户模板管理页面（管理员专用）
 * 管理所有用户上传的个人模板
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Users, Image, Search, Copy } from 'lucide-react';
import { Button, Card, Loading, Modal, useToast, useConfirm, UserMenu, Pagination, ImagePreviewModal, Input } from '@/components/shared';
import { adminListUserTemplates, adminDeleteUserTemplate, adminCopyUserTemplateToPreset } from '@/api/endpoints';
import type { UserTemplate } from '@/api/endpoints';
import { getImageUrl } from '@/api/client';
import { formatDate } from '@/utils/projectUtils';

export const AdminUserTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchUserId, setSearchUserId] = useState('');

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  // 复制为预设模板弹窗状态
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyingTemplate, setCopyingTemplate] = useState<UserTemplate | null>(null);
  const [presetName, setPresetName] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminListUserTemplates({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        user_id: searchUserId || undefined,
      });
      if (response.data) {
        setTemplates(response.data.templates);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      console.error('加载用户模板失败:', error);
      show({ message: '加载用户模板失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchUserId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // 删除用户模板
  const handleDelete = (template: UserTemplate) => {
    confirm(
      `确定要删除用户「${template.username || '未知'}」的模板吗？此操作不可恢复。`,
      async () => {
        try {
          await adminDeleteUserTemplate(template.template_id);
          show({ message: '用户模板已删除', type: 'success' });
          loadTemplates();
        } catch (error: any) {
          show({ message: '删除失败: ' + (error.message || '未知错误'), type: 'error' });
        }
      },
      { title: '删除用户模板', confirmText: '删除', variant: 'danger' }
    );
  };

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    loadTemplates();
  };

  // 打开复制弹窗
  const handleOpenCopyModal = (template: UserTemplate) => {
    setCopyingTemplate(template);
    setPresetName('');
    setCopyModalOpen(true);
  };

  // 执行复制
  const handleCopyToPreset = async () => {
    if (!copyingTemplate || !presetName.trim()) {
      show({ message: '请输入预设模板名称', type: 'error' });
      return;
    }
    setIsCopying(true);
    try {
      await adminCopyUserTemplateToPreset(copyingTemplate.template_id, presetName.trim());
      show({ message: '已成功复制为预设模板', type: 'success' });
      setCopyModalOpen(false);
      setCopyingTemplate(null);
      setPresetName('');
    } catch (error: any) {
      show({ message: '复制失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      {/* 统一导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Users size={24} className="text-banana-600" />
              <h1 className="text-xl font-bold text-gray-900">用户模板管理</h1>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          {/* 搜索栏 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 max-w-xs">
              <Input
                placeholder="按用户ID筛选"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="secondary" size="sm" icon={<Search size={16} />} onClick={handleSearch}>
              搜索
            </Button>
            <span className="text-sm text-gray-500 ml-auto">共 {total} 个用户模板</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loading /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Image size={48} className="mx-auto mb-4 text-gray-300" />
              <p>暂无用户模板</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {templates.map((template) => (
                <div key={template.template_id} className="flex flex-col">
                  {/* 缩略图容器 */}
                  <div className="group relative aspect-[4/3] rounded-lg border border-gray-200 overflow-hidden hover:border-banana-400 transition-colors">
                    <img
                      src={getImageUrl(template.template_image_url)}
                      alt="用户模板"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewImage({ url: getImageUrl(template.template_image_url), title: template.username })}
                    />
                    {/* 创建时间 - 显示在图片底部 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                      <p className="text-white/80 text-xs">{formatDate(template.created_at)}</p>
                    </div>
                    {/* 操作按钮组 - hover时显示 */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 复制为预设按钮 */}
                      <button
                        onClick={() => handleOpenCopyModal(template)}
                        className="p-1.5 bg-banana-500 text-white rounded-full hover:bg-banana-600"
                        title="复制为预设模板"
                      >
                        <Copy size={14} />
                      </button>
                      {/* 删除按钮 */}
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* 用户名 - 显示在缩略图下方 */}
                  <p className="mt-1.5 text-xs text-gray-600 text-center truncate" title={template.username}>
                    用户: {template.username || '未知'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {total > pageSize && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(total / pageSize)}
                total={total}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                showPageSize={false}
              />
            </div>
          )}
        </Card>
      </main>

      {/* 图片预览 */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
      />

      {/* 复制为预设模板弹窗 */}
      <Modal
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="复制为预设模板"
        size="sm"
      >
        <div className="space-y-4">
          {copyingTemplate && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <img
                src={getImageUrl(copyingTemplate.template_image_url)}
                alt="模板预览"
                className="w-16 h-12 object-cover rounded"
              />
              <div className="text-sm text-gray-600">
                <p>来源用户: {copyingTemplate.username || '未知'}</p>
                <p>上传时间: {formatDate(copyingTemplate.created_at)}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预设模板名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="请输入预设模板名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-banana-500 focus:border-banana-500"
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-500">
            复制后将创建一个新的预设模板，原用户模板不受影响。
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCopyModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleCopyToPreset} disabled={isCopying}>
              {isCopying ? '复制中...' : '确认复制'}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};