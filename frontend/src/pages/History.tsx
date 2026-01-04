import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loading, useToast, useConfirm } from '@/components/shared';
import { ProjectCard } from '@/components/history/ProjectCard';
import { useProjectStore } from '@/store/useProjectStore';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/animations';
import * as api from '@/api/endpoints';
import { normalizeProject } from '@/utils';
import { getProjectTitle, getProjectRoute } from '@/utils/projectUtils';
import type { Project } from '@/types';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const { syncProject, setCurrentProject } = useProjectStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    loadProjects();
  }, []);

  // ===== 数据加载 =====
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listProjects(50, 0);
      if (response.data?.projects) {
        const normalizedProjects = response.data.projects.map(normalizeProject);
        setProjects(normalizedProjects);
      }
    } catch (err: any) {
      console.error('加载历史项目失败:', err);
      setError(err.message || '加载历史项目失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===== 项目选择与导航 =====
  const handleSelectProject = useCallback(async (project: Project) => {
    const projectId = project.id || project.project_id;
    if (!projectId) return;
    if (selectedProjects.size > 0) return;
    if (editingProjectId === projectId) return;

    try {
      setCurrentProject(project);
      localStorage.setItem('currentProjectId', projectId);
      await syncProject(projectId);
      const route = getProjectRoute(project);
      navigate(route, { state: { from: 'history' } });
    } catch (err: any) {
      console.error('打开项目失败:', err);
      show({ message: '打开项目失败: ' + (err.message || '未知错误'), type: 'error' });
    }
  }, [selectedProjects, editingProjectId, setCurrentProject, syncProject, navigate, show]);

  // ===== 批量选择操作 =====
  const handleToggleSelect = useCallback((projectId: string) => {
    setSelectedProjects(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(projectId)) {
        newSelected.delete(projectId);
      } else {
        newSelected.add(projectId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedProjects(prev => {
      if (prev.size === projects.length) {
        return new Set();
      } else {
        const allIds = projects.map(p => p.id || p.project_id).filter(Boolean) as string[];
        return new Set(allIds);
      }
    });
  }, [projects]);

  // ===== 删除操作 =====
  const deleteProjects = useCallback(async (projectIds: string[]) => {
    setIsDeleting(true);
    const currentProjectId = localStorage.getItem('currentProjectId');
    let deletedCurrentProject = false;

    try {
      const deletePromises = projectIds.map(projectId => api.deleteProject(projectId));
      await Promise.all(deletePromises);

      if (currentProjectId && projectIds.includes(currentProjectId)) {
        localStorage.removeItem('currentProjectId');
        setCurrentProject(null);
        deletedCurrentProject = true;
      }

      setProjects(prev => prev.filter(p => {
        const id = p.id || p.project_id;
        return id && !projectIds.includes(id);
      }));
      setSelectedProjects(new Set());

      if (deletedCurrentProject) {
        show({ message: '已删除项目，包括当前打开的项目', type: 'info' });
      } else {
        show({ message: `成功删除 ${projectIds.length} 个项目`, type: 'success' });
      }
    } catch (err: any) {
      console.error('删除项目失败:', err);
      show({ message: '删除项目失败: ' + (err.message || '未知错误'), type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }, [setCurrentProject, show]);

  const handleDeleteProject = useCallback(async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const projectId = project.id || project.project_id;
    if (!projectId) return;

    const projectTitle = getProjectTitle(project);
    confirm(
      `确定要删除项目"${projectTitle}"吗？此操作不可恢复。`,
      async () => { await deleteProjects([projectId]); },
      { title: '确认删除', variant: 'danger' }
    );
  }, [confirm, deleteProjects]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedProjects.size === 0) return;
    const count = selectedProjects.size;
    confirm(
      `确定要删除选中的 ${count} 个项目吗？此操作不可恢复。`,
      async () => {
        const projectIds = Array.from(selectedProjects);
        await deleteProjects(projectIds);
      },
      { title: '确认批量删除', variant: 'danger' }
    );
  }, [selectedProjects, confirm, deleteProjects]);

  // ===== 编辑操作 =====
  const handleStartEdit = useCallback((e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (selectedProjects.size > 0) return;
    const projectId = project.id || project.project_id;
    if (!projectId) return;
    const currentTitle = getProjectTitle(project);
    setEditingProjectId(projectId);
    setEditingTitle(currentTitle);
  }, [selectedProjects]);

  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditingTitle('');
  }, []);

  const handleSaveEdit = useCallback(async (projectId: string) => {
    if (!editingTitle.trim()) {
      show({ message: '项目名称不能为空', type: 'error' });
      return;
    }
    try {
      await api.updateProject(projectId, { idea_prompt: editingTitle.trim() });
      setProjects(prev => prev.map(p => {
        const id = p.id || p.project_id;
        if (id === projectId) {
          return { ...p, idea_prompt: editingTitle.trim() };
        }
        return p;
      }));
      setEditingProjectId(null);
      setEditingTitle('');
      show({ message: '项目名称已更新', type: 'success' });
    } catch (err: any) {
      console.error('更新项目名称失败:', err);
      show({ message: '更新项目名称失败: ' + (err.message || '未知错误'), type: 'error' });
    }
  }, [editingTitle, show]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent, projectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(projectId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // ===== Topbar 右侧内容 =====
  const topbarRightContent = (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={() => navigate('/')}
    >
      <Home className="h-4 w-4" />
      <span className="hidden sm:inline">主页</span>
    </Button>
  );

  // ===== 页面操作按钮 =====
  const pageActions = projects.length > 0 && selectedProjects.size > 0 ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        已选择 {selectedProjects.size} 项
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSelectedProjects(new Set())}
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
    </div>
  ) : null;

  return (
    <AppShell showSidebar={true} topbarRightContent={topbarRightContent}>
      <motion.div
        className="max-w-6xl mx-auto px-4 py-8"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <PageHeader
          title="历史项目"
          description="查看和管理你的所有项目"
          actions={pageActions}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading message="加载中..." />
          </div>
        ) : error ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadProjects}>重试</Button>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                暂无历史项目
              </h3>
              <p className="text-muted-foreground mb-6">
                创建你的第一个项目开始使用吧
              </p>
              <Button onClick={() => navigate('/')}>创建新项目</Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* 全选工具栏 - Linear 风格 */}
            <div className="flex items-center justify-between py-3 px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 transition-all duration-150',
                  'flex items-center justify-center',
                  selectedProjects.size === projects.length && projects.length > 0
                    ? 'bg-primary border-primary'
                    : 'border-border group-hover:border-primary/50 bg-background'
                )}>
                  <input
                    type="checkbox"
                    checked={selectedProjects.size === projects.length && projects.length > 0}
                    onChange={handleSelectAll}
                    className="sr-only"
                  />
                  {selectedProjects.size === projects.length && projects.length > 0 && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {selectedProjects.size === projects.length ? '取消全选' : '全选'}
                </span>
              </label>
              <span className="text-sm text-muted-foreground">
                共 {projects.length} 个项目
              </span>
            </div>

            {projects.map((project) => {
              const projectId = project.id || project.project_id;
              if (!projectId) return null;

              return (
                <motion.div key={projectId} variants={staggerItem}>
                  <ProjectCard
                    project={project}
                    isSelected={selectedProjects.has(projectId)}
                    isEditing={editingProjectId === projectId}
                    editingTitle={editingTitle}
                    onSelect={handleSelectProject}
                    onToggleSelect={handleToggleSelect}
                    onDelete={handleDeleteProject}
                    onStartEdit={handleStartEdit}
                    onTitleChange={setEditingTitle}
                    onTitleKeyDown={handleTitleKeyDown}
                    onSaveEdit={handleSaveEdit}
                    isBatchMode={selectedProjects.size > 0}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
      <ToastContainer />
      {ConfirmDialog}
    </AppShell>
  );
};
