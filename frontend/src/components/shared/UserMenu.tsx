/**
 * 用户菜单组件
 * 显示当前用户信息、会员状态和登出功能
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, ChevronDown, Users, Key, Eye, EyeOff, FolderOpen, FileText, Crown, Image, Zap, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { useToast } from './Toast';
import { changePassword } from '@/api/auth';
import * as membershipApi from '@/api/membership';
import type { MembershipStatus } from '@/api/membership';

// 会员等级配置
const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  free: { label: '免费用户', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  basic: { label: '基础会员', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  premium: { label: '高级会员', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  admin: { label: '管理员', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuthStore();
  const { show, ToastContainer } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 会员状态
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);

  // 修改密码相关状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 获取会员状态
  useEffect(() => {
    if (user) {
      membershipApi.getMembershipStatus()
        .then(setMembershipStatus)
        .catch(() => {}); // 静默失败
    }
  }, [user]);

  // 获取等级配置
  const getLevelConfig = (level: string) => {
    return LEVEL_CONFIG[level] || LEVEL_CONFIG.free;
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      // 无论成功失败都跳转到首页
      navigate('/');
    }
  };

  // 打开修改密码弹窗
  const handleOpenPasswordModal = () => {
    setIsOpen(false);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswords(false);
    setShowPasswordModal(true);
  };

  // 修改密码处理
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      show({ message: '请填写所有密码字段', type: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      show({ message: '新密码长度不能少于 8 个字符', type: 'error' });
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasDigit) {
      show({ message: '新密码必须包含字母和数字', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      show({ message: '两次输入的新密码不一致', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      show({ message: '密码修改成功', type: 'success' });
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || '修改失败';
      show({ message: msg, type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg
          hover:bg-banana-100/60 hover:shadow-sm transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-banana-400 to-orange-400
          flex items-center justify-center text-white font-medium text-sm">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
          {user.username}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg
          border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-banana-400 to-orange-400
                flex items-center justify-center text-white font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                {/* 会员等级徽章 */}
                {membershipStatus && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded
                    ${getLevelConfig(membershipStatus.effective_level).color}
                    ${getLevelConfig(membershipStatus.effective_level).bgColor}`}>
                    {membershipStatus.effective_level === 'admin' ? <Shield size={10} /> : <Crown size={10} />}
                    {getLevelConfig(membershipStatus.effective_level).label}
                  </span>
                )}
                {!membershipStatus && isAdmin() && (
                  <span className="inline-flex items-center gap-1 text-xs text-banana-600 font-medium">
                    <Shield size={12} />
                    管理员
                  </span>
                )}
              </div>
            </div>
            {/* 配额显示 */}
            {membershipStatus && !isAdmin() && (
              <div className="mt-3 flex gap-3 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <Image size={12} className="text-blue-500" />
                  <span>图片: <strong className="text-gray-700">{membershipStatus.image_quota}</strong></span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Zap size={12} className="text-purple-500" />
                  <span>高级: <strong className="text-gray-700">{membershipStatus.premium_quota}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* 修改密码 */}
          <div className="px-2 py-1 border-b border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/membership');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                hover:bg-banana-50 hover:text-banana-700 rounded-lg transition-colors duration-150"
            >
              <Crown size={16} />
              会员中心
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                hover:bg-banana-50 hover:text-banana-700 rounded-lg transition-colors duration-150"
            >
              <User size={16} />
              个人信息
            </button>
            <button
              onClick={handleOpenPasswordModal}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                hover:bg-banana-50 hover:text-banana-700 rounded-lg transition-colors duration-150"
            >
              <Key size={16} />
              修改密码
            </button>
          </div>

          {/* 管理员菜单 */}
          {isAdmin() && (
            <div className="px-2 py-1 border-b border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/users');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                  hover:bg-banana-50 hover:text-banana-700 rounded-lg transition-colors duration-150"
              >
                <Users size={16} />
                用户管理
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/projects');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                  hover:bg-banana-50 hover:text-banana-700 rounded-lg transition-colors duration-150"
              >
                <FolderOpen size={16} />
                项目管理
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/audit-logs');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                  hover:bg-banana-50 hover:text-banana-700 rounded-lg transition-colors duration-150"
              >
                <FileText size={16} />
                审计日志
              </button>
            </div>
          )}

          {/* 登出按钮 */}
          <div className="px-2 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700
                hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-150"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="修改密码"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="当前密码"
            type={showPasswords ? 'text' : 'password'}
            placeholder="请输入当前密码"
            value={passwordForm.oldPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
          />
          <Input
            label="新密码"
            type={showPasswords ? 'text' : 'password'}
            placeholder="至少8位，含字母和数字"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
          />
          <Input
            label="确认新密码"
            type={showPasswords ? 'text' : 'password'}
            placeholder="再次输入新密码"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="mr-2"
              />
              {showPasswords ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
              显示密码
            </label>
          </div>
          <p className="text-xs text-gray-500">
            密码要求：至少 8 个字符，必须包含字母和数字
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowPasswordModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleChangePassword}
              loading={isChangingPassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? '修改中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
};
