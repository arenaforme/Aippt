/**
 * 审计日志页面（管理员专用）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, FileText, CheckCircle, XCircle, Filter } from 'lucide-react';
import { Button, Card, Input, Loading, UserMenu, Pagination } from '@/components/shared';
import { listAuditLogs, listUsers } from '@/api/endpoints';
import { formatDate } from '@/utils/projectUtils';
import type { AuditLogEntry, AdminUser } from '@/api/endpoints';

// 操作类型映射
const ACTION_LABELS: Record<string, string> = {
  login: '用户登录',
  logout: '用户登出',
  register: '用户注册',
  change_password: '修改密码',
  user_create: '创建用户',
  user_update: '更新用户',
  user_delete: '删除用户',
  user_password_reset: '重置密码',
  project_delete: '删除项目',
  assign_project: '分配项目',
  settings_update: '更新设置',
};

export const AuditLogs: React.FC = () => {
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 筛选条件
  const [usernameFilter, setUsernameFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 加载审计日志
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listAuditLogs({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        username: usernameFilter || undefined,
        action: actionFilter || undefined,
        result: resultFilter || undefined,
      });
      if (response.data) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      console.error('加载审计日志失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [usernameFilter, actionFilter, resultFilter, currentPage, pageSize]);

  // 加载用户列表
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
    loadLogs();
    loadUsers();
  }, [loadLogs, loadUsers]);

  // 获取操作类型标签
  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action;
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // 搜索处理（重置页码）
  const handleSearch = () => {
    setCurrentPage(1);
    loadLogs();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-white">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-banana-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">审计日志</h1>
            <span className="text-sm text-gray-500">共 {total} 条记录</span>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          {/* 筛选栏 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="搜索用户名..."
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                icon={<Search size={18} />}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">所有操作</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            >
              <option value="">全部结果</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>
            <Button onClick={handleSearch}>搜索</Button>
          </div>

          {/* 日志列表 */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loading /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无日志记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">时间</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">用户</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">详情</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">IP</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-500">{formatDate(log.created_at)}</td>
                      <td className="py-3 px-4 font-medium">{log.username}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{log.ip_address || '-'}</td>
                      <td className="py-3 px-4">
                        {log.result === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} /> 成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle size={16} /> 失败
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {!isLoading && logs.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              className="mt-6"
            />
          )}
        </Card>
      </main>
    </div>
  );
};

export default AuditLogs;
