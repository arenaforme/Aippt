import React, { useState, useEffect } from 'react';
import { Button, useToast, MaterialSelector, ImagePreviewModal } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import { listUserTemplates, uploadUserTemplate, deleteUserTemplate, type UserTemplate } from '@/api/endpoints';
import { materialUrlToFile } from '@/components/shared/MaterialSelector';
import type { Material } from '@/api/endpoints';
import { ImagePlus, X, Shield, ZoomIn, Check } from 'lucide-react';
import { checkImageResolution } from '@/utils';

interface TemplateSelectorProps {
  onSelect: (templateFile: File | null, templateId?: string) => void;
  selectedTemplateId?: string | null;
  selectedPresetTemplateId?: string | null;
  currentTemplatePath?: string | null; // 当前项目已选择的模板路径（已废弃，保留兼容）
  projectTemplateId?: string | null; // 项目中存储的模板ID，用于恢复选中状态
  showUpload?: boolean; // 是否显示上传到用户模板库的选项
  projectId?: string | null; // 项目ID，用于素材选择器
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  selectedTemplateId,
  selectedPresetTemplateId,
  currentTemplatePath,
  projectTemplateId,
  showUpload = true,
  projectId,
}) => {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const { show, ToastContainer } = useToast();

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  // 加载用户模板列表
  useEffect(() => {
    loadUserTemplates();
  }, []);

  const loadUserTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await listUserTemplates();
      if (response.data?.templates) {
        setUserTemplates(response.data.templates);
      }
    } catch (error: any) {
      console.error('加载用户模板失败:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // 分离预设模板和用户模板
  const presetTemplates = userTemplates.filter(t => t.is_preset);
  const myTemplates = userTemplates.filter(t => !t.is_preset);

  // 判断模板是否被选中
  // 优先级：当前会话选择 > 项目存储的模板ID
  const isTemplateSelected = (template: UserTemplate): boolean => {
    // 1. 通过 selectedTemplateId 判断（当前会话中选择的用户模板）
    if (selectedTemplateId && selectedTemplateId === template.template_id) {
      return true;
    }
    // 2. 通过 selectedPresetTemplateId 判断（当前会话中选择的预设模板）
    if (selectedPresetTemplateId && selectedPresetTemplateId === template.template_id) {
      return true;
    }
    // 3. 通过 projectTemplateId 判断（从项目数据恢复的）
    // 只有当前会话没有选择时才使用项目存储的ID
    if (!selectedTemplateId && !selectedPresetTemplateId && projectTemplateId) {
      return projectTemplateId === template.template_id;
    }
    return false;
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 检测图片分辨率并提示
        const resolution = await checkImageResolution(file);
        if (resolution.message) {
          show({
            message: resolution.message,
            type: resolution.status === 'low' ? 'warning' : 'info'
          });
        }

        if (showUpload) {
          const response = await uploadUserTemplate(file);
          if (response.data) {
            const template = response.data;
            setUserTemplates(prev => [template, ...prev]);
            onSelect(null, template.template_id);
            show({ message: '模板上传成功', type: 'success' });
          }
        } else {
          if (saveToLibrary) {
            const response = await uploadUserTemplate(file);
            if (response.data) {
              const template = response.data;
              setUserTemplates(prev => [template, ...prev]);
              onSelect(file, template.template_id);
              show({ message: '模板已保存到模板库', type: 'success' });
            }
          } else {
            onSelect(file);
          }
        }
      } catch (error: any) {
        console.error('上传模板失败:', error);
        show({ message: '模板上传失败: ' + (error.message || '未知错误'), type: 'error' });
      }
    }
    e.target.value = '';
  };

  const handleSelectUserTemplate = (template: UserTemplate) => {
    onSelect(null, template.template_id);
  };

  const handleSelectMaterials = async (materials: Material[], saveAsTemplate?: boolean) => {
    if (materials.length === 0) return;

    try {
      const file = await materialUrlToFile(materials[0]);

      if (saveAsTemplate) {
        const response = await uploadUserTemplate(file);
        if (response.data) {
          const template = response.data;
          setUserTemplates(prev => [template, ...prev]);
          onSelect(file, template.template_id);
          show({ message: '素材已保存到模板库', type: 'success' });
        }
      } else {
        onSelect(file);
        show({ message: '已从素材库选择作为模板', type: 'success' });
      }
    } catch (error: any) {
      console.error('加载素材失败:', error);
      show({ message: '加载素材失败: ' + (error.message || '未知错误'), type: 'error' });
    }
  };

  const handleDeleteUserTemplate = async (template: UserTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTemplateId === template.template_id) {
      show({ message: '当前使用中的模板不能删除，请先取消选择或切换', type: 'info' });
      return;
    }
    setDeletingTemplateId(template.template_id);
    try {
      await deleteUserTemplate(template.template_id);
      setUserTemplates((prev) => prev.filter((t) => t.template_id !== template.template_id));
      show({ message: '模板已删除', type: 'success' });
    } catch (error: any) {
      console.error('删除模板失败:', error);
      show({ message: '删除模板失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // 点击缩略图预览大图
  const handlePreview = (imageUrl: string, title?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewImage({ url: imageUrl, title });
  };

  return (
    <>
      <div className="space-y-4">
        {/* 预设模板（来自数据库） */}
        {presetTemplates.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Shield size={14} className="text-banana-600" />
              预设模板
            </h4>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {presetTemplates.map((template) => {
                const isSelected = isTemplateSelected(template);
                return (
                  <div
                    key={template.template_id}
                    className="flex flex-col"
                  >
                    {/* 缩略图容器 */}
                    <div
                      onClick={() => handleSelectUserTemplate(template)}
                      className={`aspect-[4/3] rounded-lg border-2 cursor-pointer transition-all relative group ${
                        isSelected
                          ? 'border-banana-500 ring-2 ring-banana-200'
                          : 'border-gray-200 hover:border-banana-300'
                      }`}
                    >
                      <img
                        src={getImageUrl(template.template_image_url)}
                        alt={template.name || 'Template'}
                        className="absolute inset-0 w-full h-full object-cover rounded-md"
                      />
                      {/* 官方标签 */}
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-banana-500 text-white text-xs rounded">
                        官方
                      </span>
                      {/* 预览按钮 - hover时显示 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(getImageUrl(template.template_image_url), template.name);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        aria-label="预览大图"
                      >
                        <ZoomIn size={14} />
                      </button>
                      {/* 选中状态遮罩 */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center pointer-events-none rounded-md">
                          <div className="w-8 h-8 bg-banana-500 rounded-full flex items-center justify-center">
                            <Check size={18} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 模板名称 - 显示在缩略图下方 */}
                    <p className="mt-1.5 text-xs text-gray-600 text-center truncate" title={template.name}>
                      {template.name || '未命名'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 我的模板 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">我的模板</h4>
          <div className="grid grid-cols-4 gap-4">
            {myTemplates.map((template) => {
              const isSelected = isTemplateSelected(template);
              return (
                <div
                  key={template.template_id}
                  className="flex flex-col"
                >
                  {/* 缩略图容器 */}
                  <div
                    onClick={() => handleSelectUserTemplate(template)}
                    className={`aspect-[4/3] rounded-lg border-2 cursor-pointer transition-all relative group ${
                      isSelected
                        ? 'border-banana-500 ring-2 ring-banana-200'
                        : 'border-gray-200 hover:border-banana-300'
                    }`}
                  >
                    <img
                      src={getImageUrl(template.template_image_url)}
                      alt={template.name || 'Template'}
                      className="absolute inset-0 w-full h-full object-cover rounded-md"
                    />
                    {/* 预览按钮 - hover时显示 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(getImageUrl(template.template_image_url), template.name);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      aria-label="预览大图"
                    >
                      <ZoomIn size={14} />
                    </button>
                    {/* 删除按钮：仅用户模板，且未被选中时显示 - 左上角 */}
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteUserTemplate(template, e)}
                        disabled={deletingTemplateId === template.template_id}
                        className={`absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity ${
                          deletingTemplateId === template.template_id ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        aria-label="删除模板"
                      >
                        <X size={12} />
                      </button>
                    )}
                    {/* 选中状态遮罩 */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center pointer-events-none rounded-md">
                        <div className="w-8 h-8 bg-banana-500 rounded-full flex items-center justify-center">
                          <Check size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* 模板名称占位（用户模板可能没有名称） */}
                  <p className="mt-1.5 text-xs text-gray-400 text-center truncate h-4">
                    {template.name || ''}
                  </p>
                </div>
              );
            })}

            {/* 上传新模板 */}
            <label className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 hover:border-banana-500 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden">
              <span className="text-2xl">+</span>
              <span className="text-sm text-gray-500">上传模板</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleTemplateUpload}
                className="hidden"
                disabled={isLoadingTemplates}
              />
            </label>
          </div>

          {/* 在预览页显示：上传模板时是否保存到模板库的选项 */}
          {!showUpload && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="w-4 h-4 text-banana-500 border-gray-300 rounded focus:ring-banana-500"
                />
                <span className="text-sm text-gray-700">
                  上传模板时同时保存到我的模板库
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 从素材库选择作为模板 */}
        {projectId && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">从素材库选择</h4>
            <Button
              variant="secondary"
              size="sm"
              icon={<ImagePlus size={16} />}
              onClick={() => setIsMaterialSelectorOpen(true)}
              className="w-full"
            >
              从素材库选择作为模板
            </Button>
          </div>
        )}
      </div>
      <ToastContainer />
      {/* 素材选择器 */}
      {projectId && (
        <MaterialSelector
          projectId={projectId}
          isOpen={isMaterialSelectorOpen}
          onClose={() => setIsMaterialSelectorOpen(false)}
          onSelect={handleSelectMaterials}
          multiple={false}
          showSaveAsTemplateOption={true}
        />
      )}
      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
      />
    </>
  );
};

/**
 * 根据模板ID获取模板File对象（按需加载）
 * @param templateId 模板ID
 * @param userTemplates 用户模板列表
 * @returns Promise<File | null>
 */
export const getTemplateFile = async (
  templateId: string,
  userTemplates: UserTemplate[]
): Promise<File | null> => {
  // 检查是否是用户模板或预设模板
  const template = userTemplates.find(t => t.template_id === templateId);
  if (template) {
    try {
      const imageUrl = getImageUrl(template.template_image_url);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], 'template.png', { type: blob.type });
    } catch (error) {
      console.error('加载模板失败:', error);
      return null;
    }
  }

  return null;
};
