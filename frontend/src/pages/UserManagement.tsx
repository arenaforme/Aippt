/**
 * 用户管理页面（管理员专用）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Shield, User, Trash2, Key, Edit2, ToggleLeft, ToggleRight, Crown, Image, Zap, FileText, Phone } from 'lucide-react';
import { Button, Card, Input, Loading, Modal, useToast, useConfirm, UserMenu, Pagination } from '@/components/shared';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword, getSystemConfig, updateSystemConfig } from '@/api/endpoints';
import { formatDate } from '@/utils/projectUtils';
import * as membershipApi from '@/api/membership';
import type { AdminUser } from '@/api/endpoints';
import type { MembershipPlan } from '@/api/membership';
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

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 会员管理相关状态
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [membershipForm, setMembershipForm] = useState({ plan_id: '', expires_at: '' });
  const [quotaForm, setQuotaForm] = useState({ image_quota: 0, premium_quota: 0 });
  const [isSavingMembership, setIsSavingMembership] = useState(false);
  const [isSavingQuota, setIsSavingQuota] = useState(false);

  // 注册开关状态
  const [allowRegistration, setAllowRegistration] = useState<boolean>(true);
  const [isTogglingRegistration, setIsTogglingRegistration] = useState(false);

  // 管理员二次认证开关状态
  const [admin2faEnabled, setAdmin2faEnabled] = useState<boolean>(true);
  const [isToggling2fa, setIsToggling2fa] = useState(false);

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
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        search: searchTerm || undefined,
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
  }, [roleFilter, statusFilter, searchTerm, currentPage, pageSize]); // 移除 show 依赖，避免无限循环

  // 加载系统配置
  const loadSystemConfig = useCallback(async () => {
    try {
      const response = await getSystemConfig();
      if (response.data) {
        setAllowRegistration(response.data.allow_registration);
        setAdmin2faEnabled(response.data.admin_2fa_enabled);
      }
    } catch (error: any) {
      console.error('加载系统配置失败:', error);
    }
  }, []);

  // 切换注册开关
  const handleToggleRegistration = async () => {
    setIsTogglingRegistration(true);
    try {
      const newValue = !allowRegistration;
      await updateSystemConfig({ allow_registration: newValue });
      setAllowRegistration(newValue);
      show({ message: newValue ? '已开启用户注册' : '已关闭用户注册', type: 'success' });
    } catch (error: any) {
      show({ message: '更新失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsTogglingRegistration(false);
    }
  };

  // 切换管理员二次认证开关
  const handleToggle2fa = async () => {
    setIsToggling2fa(true);
    try {
      const newValue = !admin2faEnabled;
      await updateSystemConfig({ admin_2fa_enabled: newValue });
      setAdmin2faEnabled(newValue);
      show({ message: newValue ? '已开启管理员二次认证' : '已关闭管理员二次认证', type: 'success' });
    } catch (error: any) {
      show({ message: '更新失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsToggling2fa(false);
    }
  };

  // 加载会员套餐列表
  const loadPlans = useCallback(async () => {
    try {
      const plans = await membershipApi.adminGetAllPlans();
      setPlans(plans);
    } catch (error: any) {
      console.error('加载套餐列表失败:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadSystemConfig();
    loadPlans();
  }, [loadUsers, loadSystemConfig, loadPlans]);

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
  };

  const totalPages = Math.ceil(total / pageSize);

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

  // 打开设置会员弹窗
  const openMembershipModal = (userId: string, username: string, user: AdminUser) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setMembershipForm({
      plan_id: '',
      expires_at: user.membership_expires_at?.split('T')[0] || '',
    });
    setIsMembershipModalOpen(true);
  };

  // 打开调整配额弹窗
  const openQuotaModal = (userId: string, username: string, user: AdminUser) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setQuotaForm({
      image_quota: user.image_quota || 0,
      premium_quota: user.premium_quota || 0,
    });
    setIsQuotaModalOpen(true);
  };

  // 保存会员设置
  const handleSaveMembership = async () => {
    if (!selectedUserId || !membershipForm.plan_id) {
      show({ message: '请选择套餐', type: 'error' });
      return;
    }
    setIsSavingMembership(true);
    try {
      await membershipApi.adminSetUserMembership(selectedUserId, {
        plan_id: membershipForm.plan_id,
        expires_at: membershipForm.expires_at || undefined,
      });
      show({ message: '会员设置成功', type: 'success' });
      setIsMembershipModalOpen(false);
      loadUsers();
    } catch (error: any) {
      show({ message: '设置失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsSavingMembership(false);
    }
  };

  // 保存配额调整
  const handleSaveQuota = async () => {
    if (!selectedUserId) return;
    setIsSavingQuota(true);
    try {
      await membershipApi.adminSetUserQuota(selectedUserId, quotaForm);
      show({ message: '配额调整成功', type: 'success' });
      setIsQuotaModalOpen(false);
      loadUsers();
    } catch (error: any) {
      show({ message: '调整失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsSavingQuota(false);
    }
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
              返回
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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
              <Button variant="outline" icon={<Crown size={18} />} onClick={() => navigate('/admin/membership/plans')}>
                套餐管理
              </Button>
              <Button variant="outline" icon={<FileText size={18} />} onClick={() => navigate('/admin/orders')}>
                订单管理
              </Button>
              <Button variant="outline" icon={<FileText size={18} />} onClick={() => navigate('/admin/agreements')}>
                协议管理
              </Button>
              <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreateModalOpen(true)}>
                创建用户
              </Button>
            </div>
          </div>

          {/* 用户统计和系统设置 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="text-sm text-gray-500">
              共 {total} 个用户
            </div>
            <div className="flex items-center gap-6">
              {/* 管理员二次认证开关 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">管理员二次认证</span>
                <button
                  onClick={handleToggle2fa}
                  disabled={isToggling2fa}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    admin2faEnabled ? 'bg-banana-500' : 'bg-gray-300'
                  } ${isToggling2fa ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      admin2faEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs ${admin2faEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                  {admin2faEnabled ? '已开启' : '已关闭'}
                </span>
              </div>
              {/* 允许用户注册开关 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">允许用户注册</span>
                <button
                  onClick={handleToggleRegistration}
                  disabled={isTogglingRegistration}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    allowRegistration ? 'bg-banana-500' : 'bg-gray-300'
                  } ${isTogglingRegistration ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      allowRegistration ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs ${allowRegistration ? 'text-green-600' : 'text-gray-500'}`}>
                  {allowRegistration ? '已开启' : '已关闭'}
                </span>
              </div>
            </div>
          </div>

          {/* 用户列表表格 */}
          <UserTable
            users={users}
            currentUserId={currentUser?.id}
            onUpdateRole={handleUpdateRole}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteUser}
            onResetPassword={openResetPasswordModal}
            onSetMembership={openMembershipModal}
            onSetQuota={openQuotaModal}
          />

          {/* 分页 */}
          {!isLoading && users.length > 0 && (
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

      {/* 设置会员弹窗 */}
      <SetMembershipModal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        username={selectedUsername}
        plans={plans}
        form={membershipForm}
        setForm={setMembershipForm}
        onSave={handleSaveMembership}
        isSaving={isSavingMembership}
      />

      {/* 调整配额弹窗 */}
      <SetQuotaModal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        username={selectedUsername}
        form={quotaForm}
        setForm={setQuotaForm}
        onSave={handleSaveQuota}
        isSaving={isSavingQuota}
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
  onSetMembership: (userId: string, username: string, user: AdminUser) => void;
  onSetQuota: (userId: string, username: string, user: AdminUser) => void;
}> = ({ users, currentUserId, onUpdateRole, onUpdateStatus, onDelete, onResetPassword, onSetMembership, onSetQuota }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-3 px-4 font-medium text-gray-700">用户名</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">手机号</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">角色</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">会员等级</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">配额</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
          <th className="text-left py-3 px-4 font-medium text-gray-700">创建时间</th>
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
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <span>{u.phone || '-'}</span>
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
              <MembershipLevelBadge level={u.membership_level} expiresAt={u.membership_expires_at} />
            </td>
            <td className="py-3 px-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-blue-600">
                  <Image size={12} /> {u.image_quota ?? 0}
                </span>
                <span className="flex items-center gap-1 text-purple-600">
                  <Zap size={12} /> {u.premium_quota ?? 0}
                </span>
              </div>
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
              {formatDate(u.created_at)}
            </td>
            <td className="py-3 px-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onSetMembership(u.id, u.username, u)}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                  title="设置会员"
                >
                  <Crown size={16} />
                </button>
                <button
                  onClick={() => onSetQuota(u.id, u.username, u)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="调整配额"
                >
                  <Zap size={16} />
                </button>
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
      <div>
        <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
        <p className="mt-1 text-xs text-gray-500">密码至少8位，必须包含字母和数字</p>
      </div>
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
      <div>
        <Input label="新密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入新密码" />
        <p className="mt-1 text-xs text-gray-500">密码至少8位，必须包含字母和数字</p>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={onReset} loading={isResetting}>确认重置</Button>
      </div>
    </div>
  </Modal>
);

// 会员等级徽章组件
const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  free: { label: '免费', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  basic: { label: '基础', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  premium: { label: '高级', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

const MembershipLevelBadge: React.FC<{ level?: string; expiresAt?: string }> = ({ level, expiresAt }) => {
  const config = LEVEL_CONFIG[level || 'free'] || LEVEL_CONFIG.free;
  // 处理 UTC 时间：后端返回的时间不带时区后缀，需要添加 'Z' 后缀
  const parseExpiresAt = (dateStr: string) => {
    const utcDateStr = dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)
      ? dateStr
      : dateStr + 'Z';
    return new Date(utcDateStr);
  };
  const isExpired = expiresAt && parseExpiresAt(expiresAt) < new Date();

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${config.color} ${config.bgColor}`}>
        <Crown size={10} />
        {config.label}
        {isExpired && <span className="text-red-500">(已过期)</span>}
      </span>
      {expiresAt && !isExpired && (
        <span className="text-[10px] text-gray-400">
          {parseExpiresAt(expiresAt).toLocaleDateString('zh-CN')}到期
        </span>
      )}
    </div>
  );
};

// 设置会员弹窗组件
const SetMembershipModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  username: string;
  plans: MembershipPlan[];
  form: { plan_id: string; expires_at: string };
  setForm: (v: { plan_id: string; expires_at: string }) => void;
  onSave: () => void;
  isSaving: boolean;
}> = ({ isOpen, onClose, username, plans, form, setForm, onSave, isSaving }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`设置会员 - ${username}`}>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">选择套餐</label>
        <select
          value={form.plan_id}
          onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        >
          <option value="">请选择套餐</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} - {plan.level} ({plan.price}元/{plan.duration_days}天)
            </option>
          ))}
        </select>
      </div>
      <Input
        label="过期时间（可选）"
        type="date"
        value={form.expires_at}
        onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
      />
      <p className="text-xs text-gray-500">留空则根据套餐时长自动计算过期时间</p>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={onSave} loading={isSaving}>保存</Button>
      </div>
    </div>
  </Modal>
);

// 调整配额弹窗组件
const SetQuotaModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  username: string;
  form: { image_quota: number; premium_quota: number };
  setForm: (v: { image_quota: number; premium_quota: number }) => void;
  onSave: () => void;
  isSaving: boolean;
}> = ({ isOpen, onClose, username, form, setForm, onSave, isSaving }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`调整配额 - ${username}`}>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1"><Image size={14} className="text-blue-500" /> 图片生成配额</span>
        </label>
        <input
          type="number"
          min="0"
          value={form.image_quota}
          onChange={(e) => setForm({ ...form, image_quota: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1"><Zap size={14} className="text-purple-500" /> 高级功能配额</span>
        </label>
        <input
          type="number"
          min="0"
          value={form.premium_quota}
          onChange={(e) => setForm({ ...form, premium_quota: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={onSave} loading={isSaving}>保存</Button>
      </div>
    </div>
  </Modal>
);