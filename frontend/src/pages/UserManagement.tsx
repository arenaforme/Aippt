/**
 * 用户管理页面（管理员专用）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Shield, User, Trash2, Key, Edit2 } from 'lucide-react';
import { Button, Card, Input, Loading, Modal, useToast, useConfirm, UserMenu } from '@/components/shared';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword } from '@/api/endpoints';
import type { AdminUser } from '@/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 创建用户弹窗
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [isCreating, setIsCreating] = useState(false);

  // 重置密码弹窗
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordUsername, setResetPasswordUsername] = useState('');
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listUsers({
        limit: 100,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      if (response.data) {
        setUsers(response.data.users);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      console.error('加载用户列表失败:', error);
      // 使用 setTimeout 避免在渲染周期中调用 show 导致无限循环
      setTimeout(() => {
        show({ message: '加载用户列表失败: ' + (error.message || '未知错误'), type: 'error' });
      }, 0);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, statusFilter]); // 移除 show 依赖，避免无限循环

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 过滤用户（前端搜索）
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 创建用户
  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      show({ message: '请填写用户名和密码', type: 'error' });
      return;
    }
    setIsCreating(true);
    try {
      await createUser({ username: newUsername, password: newPassword, role: newRole });
      show({ message: '用户创建成功', type: 'success' });
      setIsCreateModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      loadUsers();
    } catch (error: any) {
      show({ message: '创建失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  // 更新用户角色
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateUser(userId, { role: newRole });
      show({ message: '角色更新成功', type: 'success' });
      loadUsers();
    } catch (error: any) {
      show({ message: '更新失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    }
  };

  // 更新用户状态
  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await updateUser(userId, { status: newStatus });
      show({ message: '状态更新成功', type: 'success' });
      loadUsers();
    } catch (error: any) {
      show({ message: '更新失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    }
  };

  // 删除用户
  const handleDeleteUser = (userId: string, username: string) => {
    if (userId === currentUser?.id) {
      show({ message: '不能删除自己的账号', type: 'error' });
      return;
    }
    confirm(
      `确定要删除用户 "${username}" 吗？此操作不可恢复。`,
      async () => {
        try {
          await deleteUser(userId);
          show({ message: '用户已删除', type: 'success' });
          loadUsers();
        } catch (error: any) {
          show({ message: '删除失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
        }
      },
      { title: '确认删除用户', variant: 'danger', confirmText: '删除' }
    );
  };

  // 重置密码
  const handleResetPassword = async () => {
    if (!newPasswordForReset.trim()) {
      show({ message: '请输入新密码', type: 'error' });
      return;
    }
    if (!resetPasswordUserId) return;
    setIsResetting(true);
    try {
      await resetUserPassword(resetPasswordUserId, newPasswordForReset);
      show({ message: '密码重置成功', type: 'success' });
      setIsResetPasswordModalOpen(false);
      setNewPasswordForReset('');
      setResetPasswordUserId(null);
    } catch (error: any) {
      show({ message: '重置失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const openResetPasswordModal = (userId: string, username: string) => {
    setResetPasswordUserId(userId);
    setResetPasswordUsername(username);
    setNewPasswordForReset('');
    setIsResetPasswordModalOpen(true);
  };

  if (isLoading) {
    return <Loading fullscreen message="加载用户列表..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      <ToastContainer />
      {ConfirmDialog}

      {/* 顶栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={18} />} onClick={() => navigate('/')}>
              返回首页
            </Button>
            <div className="flex items-center gap-2">
              <Shield size={24} className="text-banana-600" />
              <h1 className="text-xl font-bold text-gray-900">用户管理</h1>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <Card className="p-6">
          {/* 工具栏 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
              >
                <option value="">全部角色</option>
                <option value="admin">管理员</option>
                <option value="user">普通用户</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
              >
                <option value="">全部状态</option>
                <option value="active">活跃</option>
                <option value="disabled">禁用</option>
              </select>
              <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreateModalOpen(true)}>
                创建用户
              </Button>
            </div>
          </div>

          {/* 用户统计 */}
          <div className="mb-4 text-sm text-gray-500">
            共 {total} 个用户，显示 {filteredUsers.length} 个
          </div>

          {/* 用户列表表格 */}
          <UserTable
            users={filteredUsers}
            currentUserId={currentUser?.id}
            onUpdateRole={handleUpdateRole}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteUser}
            onResetPassword={openResetPasswordModal}
          />
        </Card>
      </main>

      {/* 创建用户弹窗 */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        username={newUsername}
        setUsername={setNewUsername}
        password={newPassword}
        setPassword={setNewPassword}
        role={newRole}
        setRole={setNewRole}
        onCreate={handleCreateUser}
        isCreating={isCreating}
      />

      {/* 重置密码弹窗 */}
      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        username={resetPasswordUsername}
        password={newPasswordForReset}
        setPassword={setNewPasswordForReset}
        onReset={handleResetPassword}
        isResetting={isResetting}
      />
    </div>
  );
};

// ===== 子组件 =====

// 用户表格组件
const UserTable: React.FC<{
  users: AdminUser[];
  currentUserId?: string;
  onUpdateRole: (userId: string, role: string) => void;
  onUpdateStatus: (userId: string, status: string) => void;
  onDelete: (userId: string, username: string) => void;
  onResetPassword: (userId: string, username: string) => void;
}> = ({ users, currentUserId, onUpdateRole, onUpdateStatus, onDelete, onResetPassword }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-3 px-4 font-medium text-gray-700">用户名</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">角色</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">创建时间</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">最后登录</th>
          <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-3 px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-banana-400 to-orange-400 flex items-center justify-center text-white font-medium text-sm">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{u.username}</span>
                {u.id === currentUserId && <span className="text-xs text-banana-600">(当前)</span>}
              </div>
            </td>
            <td className="py-3 px-4">
              <select
                value={u.role}
                onChange={(e) => onUpdateRole(u.id, e.target.value)}
                disabled={u.id === currentUserId}
                className="px-2 py-1 text-sm border border-gray-200 rounded disabled:opacity-50"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </td>
            <td className="py-3 px-4">
              <select
                value={u.status}
                onChange={(e) => onUpdateStatus(u.id, e.target.value)}
                disabled={u.id === currentUserId}
                className={`px-2 py-1 text-sm border rounded disabled:opacity-50 ${
                  u.status === 'active' ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'
                }`}
              >
                <option value="active">活跃</option>
                <option value="disabled">禁用</option>
              </select>
            </td>
            <td className="py-3 px-4 text-sm text-gray-500">
              {new Date(u.created_at).toLocaleDateString('zh-CN')}
            </td>
            <td className="py-3 px-4 text-sm text-gray-500">
              {u.last_login_at ? new Date(u.last_login_at).toLocaleString('zh-CN') : '-'}
            </td>
            <td className="py-3 px-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onResetPassword(u.id, u.username)}
                  className="p-2 text-gray-500 hover:text-banana-600 hover:bg-banana-50 rounded"
                  title="重置密码"
                >
                  <Key size={16} />
                </button>
                <button
                  onClick={() => onDelete(u.id, u.username)}
                  disabled={u.id === currentUserId}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                  title="删除用户"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {users.length === 0 && (
      <div className="text-center py-8 text-gray-500">暂无用户数据</div>
    )}
  </div>
);

// 创建用户弹窗组件
const CreateUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  role: 'user' | 'admin';
  setRole: (v: 'user' | 'admin') => void;
  onCreate: () => void;
  isCreating: boolean;
}> = ({ isOpen, onClose, username, setUsername, password, setPassword, role, setRole, onCreate, isCreating }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="创建新用户">
    <div className="space-y-4">
      <Input label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名" />
      <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
        <select value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={onCreate} loading={isCreating}>创建</Button>
      </div>
    </div>
  </Modal>
);

// 重置密码弹窗组件
const ResetPasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  username: string;
  password: string;
  setPassword: (v: string) => void;
  onReset: () => void;
  isResetting: boolean;
}> = ({ isOpen, onClose, username, password, setPassword, onReset, isResetting }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`重置密码 - ${username}`}>
    <div className="space-y-4">
      <Input label="新密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入新密码" />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={onReset} loading={isResetting}>确认重置</Button>
      </div>
    </div>
  </Modal>
);