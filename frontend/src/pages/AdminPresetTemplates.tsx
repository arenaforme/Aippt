/**
 * 预设模板管理页面（管理员专用）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Shield, Image } from 'lucide-react';
import { Button, Card, Loading, Modal, useToast, useConfirm, UserMenu, Pagination, ImagePreviewModal } from '@/components/shared';
import { adminListPresetTemplates, adminCreatePresetTemplate, adminDeletePresetTemplate } from '@/api/endpoints';
import type { UserTemplate } from '@/api/endpoints';
import { getImageUrl } from '@/api/client';
import { formatDate } from '@/utils/projectUtils';

export const AdminPresetTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);

  // 上传弹窗状态
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminListPresetTemplates({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });
      if (response.data) {
        setTemplates(response.data.templates);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      console.error('加载预设模板失败:', error);
      show({ message: '加载预设模板失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // 上传预设模板
  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      show({ message: '请填写模板名称并选择图片', type: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      await adminCreatePresetTemplate(uploadFile, uploadName.trim());
      show({ message: '预设模板上传成功', type: 'success' });
      setIsUploadModalOpen(false);
      setUploadName('');
      setUploadFile(null);
      loadTemplates();
    } catch (error: any) {
      show({ message: '上传失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // 删除预设模板
  const handleDelete = (template: UserTemplate) => {
    confirm(
      `确定要删除预设模板「${template.name || '未命名'}」吗？此操作不可恢复。`,
      async () => {
        try {
          await adminDeletePresetTemplate(template.template_id);
          show({ message: '预设模板已删除', type: 'success' });
          loadTemplates();
        } catch (error: any) {
          show({ message: '删除失败: ' + (error.message || '未知错误'), type: 'error' });
        }
      },
      { title: '删除预设模板', confirmText: '删除', variant: 'danger' }
    );
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
              <Shield size={24} className="text-banana-600" />
              <h1 className="text-xl font-bold text-gray-900">预设模板管理</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => setIsUploadModalOpen(true)}>
              上传预设模板
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">共 {total} 个预设模板</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loading /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Image size={48} className="mx-auto mb-4 text-gray-300" />
              <p>暂无预设模板</p>
              <p className="text-sm mt-2">点击上方按钮上传第一个预设模板</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {templates.map((template) => (
                <div key={template.template_id} className="flex flex-col">
                  {/* 缩略图容器 */}
                  <div className="group relative aspect-[4/3] rounded-lg border border-gray-200 overflow-hidden hover:border-banana-400 transition-colors">
                    <img
                      src={getImageUrl(template.template_image_url)}
                      alt={template.name || '预设模板'}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewImage({ url: getImageUrl(template.template_image_url), title: template.name })}
                    />
                    {/* 创建时间 - 显示在图片底部 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                      <p className="text-white/80 text-xs">{formatDate(template.created_at)}</p>
                    </div>
                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleDelete(template)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* 模板名称 - 显示在缩略图下方 */}
                  <p className="mt-1.5 text-xs text-gray-600 text-center truncate" title={template.name}>
                    {template.name || '未命名'}
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

      {/* 上传弹窗 */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="上传预设模板">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模板名称 *</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="请输入模板名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-banana-500 focus:border-banana-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模板图片 *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {uploadFile && (
              <p className="mt-1 text-sm text-gray-500">已选择: {uploadFile.name}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? '上传中...' : '上传'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 图片预览 */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
      />

      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};