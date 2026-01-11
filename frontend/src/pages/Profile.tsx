/**
 * 个人信息页面
 * 显示用户基本信息，支持修改密码
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Calendar, Shield, ArrowLeft, Key, Crown, Image, Zap, CheckCircle, XCircle } from 'lucide-react';
import { Button, Card, useToast, Modal, Input } from '@/components/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { getProfile } from '@/api/endpoints';
import { changePassword } from '@/api/auth';
import { formatDate } from '@/utils/projectUtils';

interface MembershipInfo {
  level?: string;
  effective_level?: string;
  expires_at?: string;
  is_active?: boolean;
  image_quota?: number;
  premium_quota?: number;
}

interface ProfileData {
  id: string;
  username: string;
  phone?: string;
  role: string;
  status: string;
  created_at?: string;
  last_login_at?: string;
  membership?: MembershipInfo;
}

// 会员等级配置
const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  free: { label: '免费版', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  basic: { label: '基础版', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  premium: { label: '高级版', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { show, ToastContainer } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 如果未登录，跳转到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 获取个人信息
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        if (response.data?.user) {
          setProfile(response.data.user);
        }
      } catch (err) {
        show({ message: '获取个人信息失败', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, show]);

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword) {
      show({ message: '请输入当前密码', type: 'error' });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      show({ message: '新密码长度不能少于8个字符', type: 'error' });
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasDigit) {
      show({ message: '新密码必须包含字母和数字', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      show({ message: '两次输入的密码不一致', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await changePassword(oldPassword, newPassword);
      if (response.success) {
        show({ message: '密码修改成功', type: 'success' });
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        show({ message: response.message || '修改失败', type: 'error' });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || '修改失败';
      show({ message: errorMsg, type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-banana-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-banana-600 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>

        <Card className="p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6">个人信息</h1>

          <div className="space-y-4">
            {/* 用户名 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 w-24">用户名</span>
              <span className="text-gray-900 font-medium">{profile?.username}</span>
            </div>

            {/* 手机号 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Phone className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 w-24">手机号</span>
              <span className="text-gray-900">{profile?.phone || '未绑定'}</span>
            </div>

            {/* 角色 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 w-24">角色</span>
              <span className={`px-2 py-0.5 rounded text-sm ${
                profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {profile?.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>

            {/* 注册时间 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 w-24">注册时间</span>
              <span className="text-gray-900">{formatDate(profile?.created_at)}</span>
            </div>

            {/* 最后登录 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 w-24">最后登录</span>
              <span className="text-gray-900">{formatDate(profile?.last_login_at)}</span>
            </div>

            {/* 账户状态 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              {profile?.status === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-gray-500 w-24">账户状态</span>
              <span className={`px-2 py-0.5 rounded text-sm ${
                profile?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {profile?.status === 'active' ? '正常' : '已禁用'}
              </span>
            </div>

            {/* 会员等级 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Crown className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 w-24">会员等级</span>
              <span className={`px-2 py-0.5 rounded text-sm ${
                LEVEL_CONFIG[profile?.membership?.effective_level || 'free']?.color || 'text-gray-600'
              } ${LEVEL_CONFIG[profile?.membership?.effective_level || 'free']?.bgColor || 'bg-gray-100'}`}>
                {LEVEL_CONFIG[profile?.membership?.effective_level || 'free']?.label || '免费版'}
              </span>
            </div>

            {/* 会员到期时间（仅付费会员显示） */}
            {profile?.membership?.is_active && profile.membership.expires_at && (
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 w-24">会员到期</span>
                <span className="text-gray-900">{formatDate(profile.membership.expires_at)}</span>
              </div>
            )}

            {/* 图片生成配额 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Image className="w-5 h-5 text-blue-500" />
              <span className="text-gray-500 w-24">图片配额</span>
              <span className="text-gray-900">剩余 <strong>{profile?.membership?.image_quota ?? 0}</strong> 次</span>
            </div>

            {/* 高级功能配额 */}
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Zap className="w-5 h-5 text-purple-500" />
              <span className="text-gray-500 w-24">高级配额</span>
              <span className="text-gray-900">剩余 <strong>{profile?.membership?.premium_quota ?? 0}</strong> 次</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              修改密码
            </Button>
          </div>
        </Card>
      </div>

      {/* 修改密码弹窗 */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="修改密码"
      >
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="当前密码"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="新密码（至少8位，含字母和数字）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="确认新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? '提交中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
};
