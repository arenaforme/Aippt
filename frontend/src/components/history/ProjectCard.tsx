import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, ChevronRight, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardHover } from '@/lib/animations';
import { getProjectTitle, getFirstPageImage, formatDate, getStatusText } from '@/utils/projectUtils';
import type { Project } from '@/types';

export interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (project: Project) => void;
  onToggleSelect: (projectId: string) => void;
  onDelete: (e: React.MouseEvent, project: Project) => void;
  onStartEdit: (e: React.MouseEvent, project: Project) => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent, projectId: string) => void;
  onSaveEdit: (projectId: string) => void;
  isBatchMode: boolean;
}

// 状态颜色映射 - 使用更柔和的颜色
const getStatusStyle = (project: Project) => {
  const status = project.status;
  if (status === 'COMPLETED' || status === 'completed') {
    return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
  }
  if (status === 'GENERATING' || status === 'generating') {
    return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
  }
  if (status === 'FAILED' || status === 'failed') {
    return 'bg-red-500/10 text-red-600 border border-red-500/20';
  }
  return 'bg-muted text-muted-foreground border border-border';
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onToggleSelect,
  onDelete,
  onStartEdit,
  onTitleChange,
  onTitleKeyDown,
  onSaveEdit,
  isBatchMode,
}) => {
  const projectId = project.id || project.project_id;
  if (!projectId) return null;

  const title = getProjectTitle(project);
  const pageCount = project.pages?.length || 0;
  const statusText = getStatusText(project);
  const statusStyle = getStatusStyle(project);

  // 检测屏幕尺寸，只在非手机端加载图片
  const [shouldLoadImage, setShouldLoadImage] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setShouldLoadImage(window.innerWidth >= 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const firstPageImage = shouldLoadImage ? getFirstPageImage(project) : null;

  return (
    <motion.div
      variants={cardHover}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={cn(
        // 基础样式 - 毛玻璃效果
        'relative p-4 md:p-5 rounded-xl',
        'bg-card/80 backdrop-blur-sm',
        'border border-border/50',
        'shadow-sm',
        // 过渡动画
        'transition-all duration-200 ease-out',
        // Hover 效果
        'hover:shadow-md hover:border-border',
        'hover:bg-card/90',
        // 选中状态
        isSelected && 'ring-2 ring-primary/50 border-primary/50 bg-primary/5',
        // 光标
        isBatchMode ? 'cursor-default' : 'cursor-pointer'
      )}
      onClick={() => onSelect(project)}
    >
      {/* 选中指示条 */}
      {isSelected && (
        <div className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-full" />
      )}

      <div className="flex items-start gap-4">
        {/* 复选框 - 更精致的样式 */}
        <div
          className="pt-0.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(projectId)}
              className="sr-only peer"
            />
            <div className={cn(
              'w-5 h-5 rounded-md border-2 transition-all duration-150',
              'flex items-center justify-center',
              isSelected
                ? 'bg-primary border-primary'
                : 'border-border hover:border-primary/50 bg-background'
            )}>
              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </label>
        </div>

        {/* 中间：项目信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => onTitleKeyDown(e, projectId)}
                onBlur={() => onSaveEdit(projectId)}
                autoFocus
                className={cn(
                  'flex-1 min-w-0 px-3 py-1.5 rounded-lg',
                  'text-base font-medium',
                  'bg-background border-2 border-primary',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-150'
                )}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className={cn(
                  'text-base font-semibold text-foreground truncate flex-1 min-w-0',
                  !isBatchMode && 'hover:text-primary transition-colors cursor-pointer'
                )}
                onClick={(e) => onStartEdit(e, project)}
                title={isBatchMode ? undefined : "点击编辑名称"}
              >
                {title}
              </h3>
            )}
            <span className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
              statusStyle
            )}>
              {statusText}
            </span>
          </div>

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {pageCount} 页
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(project.updated_at || project.created_at)}
            </span>
          </div>
        </div>

        {/* 右侧：图片预览 - 更精致的样式 */}
        <div className={cn(
          'hidden sm:block flex-shrink-0',
          'w-32 h-20 md:w-48 md:h-28',
          'rounded-lg overflow-hidden',
          'bg-muted/50 border border-border/50',
          'transition-all duration-200',
          'group-hover:border-border'
        )}>
          {firstPageImage ? (
            <img
              src={firstPageImage}
              alt="第一页预览"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
              <FileText className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => onDelete(e, project)}
            className={cn(
              'p-2 rounded-lg transition-all duration-150',
              'text-muted-foreground/60 hover:text-destructive',
              'hover:bg-destructive/10'
            )}
            title="删除项目"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
        </div>
      </div>
    </motion.div>
  );
};
