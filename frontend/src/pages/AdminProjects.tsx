/**
 * 项目管理页面（管理员专用）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, FolderOpen, User, AlertTriangle, Eye } from 'lucide-react';
import { Button, Card, Input, Loading, useToast, useConfirm, UserMenu } from '@/components/shared';
import { listAllProjects, adminDeleteProject, listUsers } from '@/api/endpoints';
import type { AdminProject, AdminUser } from '@/api/endpoints';

export const AdminProjects: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [orphanedFilter, setOrphanedFilter] = useState<string>('');

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listAllProjects({
        limit: 100,
        user_id: userFilter || undefined,
        is_orphaned: orphanedFilter === 'true' ? true : orphanedFilter === 'false' ? false : undefined,
        search: searchTerm || undefined,
      });
      if (response.data) {
        setProjects(response.data.projects);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      setTimeout(() => {
        show({ message: '加载项目列表失败: ' + (error.message || '未知错误'), type: 'error' });
      }, 0);
    } finally {
      setIsLoading(false);
    }
  }, [userFilter, orphanedFilter, searchTerm]);

  // 加载用户列表（用于筛选）
  const loadUsers = useCallback(async () => {
    try {
      const response = await listUsers({ limit: 100 });
      if (response.data) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, [loadProjects, loadUsers]);

  // 删除项目
  const handleDelete = (project: AdminProject) => {
    const projectTitle = project.title || project.idea_prompt || '未命名项目';
    confirm(
      `确定要删除项目 "${projectTitle}" 吗？此操作不可恢复。`,
      async () => {
        try {
          await adminDeleteProject(project.id);
          show({ message: '项目已删除', type: 'success' });
          loadProjects();
        } catch (error: any) {
          show({ message: '删除失败: ' + (error.message || '未知错误'), type: 'error' });
        }
      },
      { title: '删除项目', confirmText: '删除', cancelText: '取消', variant: 'danger' }
    );
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      {/* 顶部导航 - 毛玻璃效果 */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">项目管理</h1>
            <span className="text-sm text-muted-foreground">共 {total} 个项目</span>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 bg-white/80 backdrop-blur-sm">
          {/* 筛选栏 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="搜索项目标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadProjects()}
                icon={<Search size={18} />}
              />
            </div>
            <select
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400 bg-background"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="">所有用户</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400 bg-background"
              value={orphanedFilter}
              onChange={(e) => setOrphanedFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="false">正常项目</option>
              <option value="true">孤立项目</option>
            </select>
            <Button onClick={loadProjects}>搜索</Button>
          </div>

          {/* 项目列表 */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loading /></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无项目</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">项目标题</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">所有者</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">更新时间</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FolderOpen size={18} className="text-banana-500" />
                          <span className="font-medium">{project.title || '未命名项目'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-muted-foreground" />
                          <span>{project.owner_username || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {project.is_orphaned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                            <AlertTriangle size={14} /> 孤立
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">正常</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{formatDate(project.updated_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/project/${project.id}/preview`)}
                            className="text-blue-500 hover:text-blue-700"
                            title="查看项目"
                          >
                            <Eye size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(project)}
                            className="text-red-500 hover:text-red-700"
                            title="删除项目"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};

export default AdminProjects;
