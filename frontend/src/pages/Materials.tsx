import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Trash2, Upload, Check, Image, RefreshCw, X, ZoomIn, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loading, useToast, useConfirm, Modal } from '@/components/shared';
import { staggerContainer, staggerItem, fadeInUp, cardHover } from '@/lib/animations';
import * as api from '@/api/endpoints';
import type { Material } from '@/api/endpoints';

export const Materials: React.FC = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      // 获取所有素材（不限定项目）
      const response = await api.listMaterials('all');
      if (response.data?.materials) {
        setMaterials(response.data.materials);
      }
    } catch (err: any) {
      console.error('加载素材失败:', err);
      show({ message: '加载素材失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [show]);

  const getMaterialKey = (material: Material) => material.id || material.url;

  const handleToggleSelect = useCallback((key: string) => {
    setSelectedMaterials(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedMaterials(prev => {
      if (prev.size === materials.length) {
        return new Set();
      } else {
        return new Set(materials.map(getMaterialKey));
      }
    });
  }, [materials]);

  const handleDeleteMaterial = useCallback(async (material: Material) => {
    const key = getMaterialKey(material);
    confirm(
      '确定要删除这个素材吗？此操作不可恢复。',
      async () => {
        setIsDeleting(true);
        try {
          if (material.id) {
            await api.deleteMaterial(material.id);
          }
          setMaterials(prev => prev.filter(m => getMaterialKey(m) !== key));
          setSelectedMaterials(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
          show({ message: '素材已删除', type: 'success' });
        } catch (err: any) {
          show({ message: '删除失败: ' + (err.message || '未知错误'), type: 'error' });
        } finally {
          setIsDeleting(false);
        }
      },
      { title: '确认删除', variant: 'danger' }
    );
  }, [confirm, show]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedMaterials.size === 0) return;
    const count = selectedMaterials.size;
    confirm(
      `确定要删除选中的 ${count} 个素材吗？此操作不可恢复。`,
      async () => {
        setIsDeleting(true);
        try {
          const toDelete = materials.filter(m => selectedMaterials.has(getMaterialKey(m)));
          await Promise.all(toDelete.map(m => m.id && api.deleteMaterial(m.id)));
          setMaterials(prev => prev.filter(m => !selectedMaterials.has(getMaterialKey(m))));
          setSelectedMaterials(new Set());
          show({ message: `成功删除 ${count} 个素材`, type: 'success' });
        } catch (err: any) {
          show({ message: '批量删除失败', type: 'error' });
        } finally {
          setIsDeleting(false);
        }
      },
      { title: '确认批量删除', variant: 'danger' }
    );
  }, [selectedMaterials, materials, confirm, show]);

  // 上传素材
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // 过滤非图片文件
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      show({ message: '请选择图片文件', type: 'error' });
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of imageFiles) {
      try {
        const response = await api.uploadMaterial(file);
        if (response.data) {
          successCount++;
        }
      } catch (err) {
        failCount++;
        console.error('上传失败:', file.name, err);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      show({ message: `成功上传 ${successCount} 个素材`, type: 'success' });
      loadMaterials();
    }
    if (failCount > 0) {
      show({ message: `${failCount} 个文件上传失败`, type: 'error' });
    }
  }, [show, loadMaterials]);

  // 文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  }, [handleUpload]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const topbarRightContent = (
    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/')}>
      <Home className="h-4 w-4" />
      <span className="hidden sm:inline">主页</span>
    </Button>
  );

  const pageActions = (
    <div className="flex items-center gap-3">
      {materials.length > 0 && selectedMaterials.size > 0 && (
        <>
          <span className="text-sm text-muted-foreground">
            已选择 {selectedMaterials.size} 项
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMaterials(new Set())}
            disabled={isDeleting}
          >
            取消选择
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleBatchDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            批量删除
          </Button>
        </>
      )}
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
        上传素材
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <PageHeader
          title="素材管理"
          description="管理你上传的图片和素材资源"
          actions={pageActions}
        />

        {/* 拖拽上传遮罩 */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'fixed inset-0 z-50',
                'bg-primary/10 backdrop-blur-sm',
                'flex items-center justify-center',
                'border-4 border-dashed border-primary'
              )}
            >
              <div className="text-center">
                <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-xl font-semibold text-primary">释放以上传素材</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading message="加载中..." />
          </div>
        ) : materials.length === 0 ? (
          <Card
            className={cn(
              'bg-card/80 backdrop-blur-sm cursor-pointer',
              'border-2 border-dashed border-border/50',
              'hover:border-primary/50 transition-colors'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                上传你的第一个素材
              </h3>
              <p className="text-muted-foreground mb-6">
                点击上传或拖拽图片到此处
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                选择文件
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* 工具栏 */}
            <div className="flex items-center justify-between py-3 px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 transition-all duration-150',
                  'flex items-center justify-center',
                  selectedMaterials.size === materials.length && materials.length > 0
                    ? 'bg-primary border-primary'
                    : 'border-border group-hover:border-primary/50 bg-background'
                )}>
                  <input
                    type="checkbox"
                    checked={selectedMaterials.size === materials.length && materials.length > 0}
                    onChange={handleSelectAll}
                    className="sr-only"
                  />
                  {selectedMaterials.size === materials.length && materials.length > 0 && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {selectedMaterials.size === materials.length ? '取消全选' : '全选'}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  共 {materials.length} 个素材
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMaterials}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* 素材网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {materials.map((material) => {
                const key = getMaterialKey(material);
                return (
                  <MaterialCard
                    key={key}
                    material={material}
                    isSelected={selectedMaterials.has(key)}
                    onToggleSelect={() => handleToggleSelect(key)}
                    onDelete={() => handleDeleteMaterial(material)}
                    onPreview={() => setPreviewMaterial(material)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* 素材预览模态框 */}
      <AnimatePresence>
        {previewMaterial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewMaterial(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] rounded-xl overflow-hidden bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewMaterial.url || previewMaterial.thumbnail_url}
                alt={previewMaterial.filename || '素材预览'}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white font-medium truncate">
                  {previewMaterial.filename || '未命名素材'}
                </p>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer />
      {ConfirmDialog}
    </AppShell>
  );
};

// 素材卡片组件
interface MaterialCardProps {
  material: Material;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material, isSelected, onToggleSelect, onDelete, onPreview
}) => {
  const imageUrl = material.url || material.thumbnail_url;

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
      onClick={onPreview}
    >
      {/* 预览图 */}
      <div className="aspect-square bg-muted/50 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={material.filename || '素材'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <Image className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* 文件名 */}
      {material.filename && (
        <div className="p-2">
          <p className="text-xs text-muted-foreground truncate">{material.filename}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className={cn(
            'p-1.5 rounded-lg',
            'bg-background/80 backdrop-blur-sm',
            'text-muted-foreground hover:text-primary',
            'hover:bg-primary/10',
            'transition-all duration-150'
          )}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
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

      {/* 选中复选框 */}
      <div
        className="absolute top-2 left-2"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
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
    </motion.div>
  );
};
