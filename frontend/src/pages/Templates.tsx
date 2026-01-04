import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Trash2, Upload, Check, Image, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loading, useToast, useConfirm } from '@/components/shared';
import { staggerContainer, staggerItem, fadeInUp, cardHover } from '@/lib/animations';
import * as api from '@/api/endpoints';
import type { UserTemplate } from '@/api/endpoints';

// 预设模板
const presetTemplates = [
  { id: '1', name: '复古卷轴', preview: '/templates/template_y.png' },
  { id: '2', name: '矢量插画', preview: '/templates/template_vector_illustration.png' },
  { id: '3', name: '拟物玻璃', preview: '/templates/template_glass.png' },
  { id: '4', name: '科技蓝', preview: '/templates/template_b.png' },
  { id: '5', name: '简约商务', preview: '/templates/template_s.png' },
  { id: '6', name: '学术报告', preview: '/templates/template_academic.png' },
];

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.listUserTemplates();
      if (response.data?.templates) {
        setUserTemplates(response.data.templates);
      }
    } catch (err: any) {
      console.error('加载模板失败:', err);
      show({ message: '加载模板失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [show]);

  const handleToggleSelect = useCallback((templateId: string) => {
    setSelectedTemplates(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(templateId)) {
        newSelected.delete(templateId);
      } else {
        newSelected.add(templateId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    confirm(
      '确定要删除这个模板吗？此操作不可恢复。',
      async () => {
        setIsDeleting(true);
        try {
          await api.deleteUserTemplate(templateId);
          setUserTemplates(prev => prev.filter(t => t.template_id !== templateId));
          setSelectedTemplates(prev => {
            const newSet = new Set(prev);
            newSet.delete(templateId);
            return newSet;
          });
          show({ message: '模板已删除', type: 'success' });
        } catch (err: any) {
          show({ message: '删除失败: ' + (err.message || '未知错误'), type: 'error' });
        } finally {
          setIsDeleting(false);
        }
      },
      { title: '确认删除', variant: 'danger' }
    );
  }, [confirm, show]);

  // 上传模板
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型（图片）
    if (!file.type.startsWith('image/')) {
      show({ message: '请选择图片文件作为模板', type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      const response = await api.uploadUserTemplate(file);
      if (response.data) {
        setUserTemplates(prev => [response.data!, ...prev]);
        show({ message: '模板上传成功', type: 'success' });
      }
    } catch (err: any) {
      console.error('上传模板失败:', err);
      show({ message: '上传失败: ' + (err.message || '未知错误'), type: 'error' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }, [show]);

  const topbarRightContent = (
    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/')}>
      <Home className="h-4 w-4" />
      <span className="hidden sm:inline">主页</span>
    </Button>
  );

  const pageActions = (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        className="gap-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        上传模板
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );

  return (
    <AppShell showSidebar={true} topbarRightContent={topbarRightContent}>
      <motion.div
        className="max-w-6xl mx-auto px-4 py-8"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <PageHeader
          title="模板库"
          description="管理你的 PPT 模板，选择合适的风格"
          actions={pageActions}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading message="加载中..." />
          </div>
        ) : (
          <motion.div
            className="space-y-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* 用户模板 */}
            {userTemplates.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-foreground">我的模板</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userTemplates.map((template) => (
                    <TemplateCard
                      key={template.template_id}
                      id={template.template_id}
                      name={template.name}
                      preview={template.template_image_url}
                      isSelected={selectedTemplates.has(template.template_id)}
                      onToggleSelect={handleToggleSelect}
                      onDelete={() => handleDeleteTemplate(template.template_id)}
                      isUserTemplate
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 预设模板 */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-foreground">预设模板</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {presetTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    preview={template.preview}
                    isSelected={false}
                    onToggleSelect={() => {}}
                    isUserTemplate={false}
                  />
                ))}
              </div>
            </section>
          </motion.div>
        )}
      </motion.div>
      <ToastContainer />
      {ConfirmDialog}
    </AppShell>
  );
};

// 模板卡片组件
interface TemplateCardProps {
  id: string;
  name: string;
  preview: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete?: () => void;
  isUserTemplate: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  id, name, preview, isSelected, onToggleSelect, onDelete, isUserTemplate
}) => {
  return (
    <motion.div
      variants={cardHover}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-card/80 backdrop-blur-sm',
        'border border-border/50',
        'shadow-sm',
        'transition-all duration-200 ease-out',
        'hover:shadow-md hover:border-border',
        'group cursor-pointer',
        isSelected && 'ring-2 ring-primary/50 border-primary/50'
      )}
    >
      {/* 预览图 */}
      <div className="aspect-[4/3] bg-muted/50 overflow-hidden">
        {preview ? (
          <img src={preview} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <Image className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* 信息栏 */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground truncate">{name}</h3>
      </div>

      {/* 用户模板操作 */}
      {isUserTemplate && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className={cn(
              'p-1.5 rounded-lg',
              'bg-background/80 backdrop-blur-sm',
              'text-muted-foreground hover:text-destructive',
              'hover:bg-destructive/10',
              'transition-all duration-150'
            )}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 选中复选框 */}
      {isUserTemplate && (
        <div
          className="absolute top-2 left-2"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(id); }}
        >
          <div className={cn(
            'w-5 h-5 rounded-md border-2 transition-all duration-150',
            'flex items-center justify-center',
            'bg-background/80 backdrop-blur-sm',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-border hover:border-primary/50'
          )}>
            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </div>
      )}
    </motion.div>
  );
};
