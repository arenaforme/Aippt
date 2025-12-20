/**
 * 注册页面
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button, Input, Card, useToast } from '@/components/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { getRegistrationStatus } from '@/api/auth';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, error, setError } = useAuthStore();
  const { show, ToastContainer } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null);

  // 如果已登录，跳转到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // 获取注册开关状态
  useEffect(() => {
    const fetchRegistrationStatus = async () => {
      try {
        const response = await getRegistrationStatus();
        setAllowRegistration(response.data?.allow_registration ?? false);
      } catch (error) {
        console.warn('获取注册状态失败');
        setAllowRegistration(false);
      }
    };
    fetchRegistrationStatus();
  }, []);

  // 显示错误
  useEffect(() => {
    if (error) {
      show({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError, show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      show({ message: '请输入用户名', type: 'error' });
      return;
    }

    if (username.trim().length < 3 || username.trim().length > 50) {
      show({ message: '用户名长度必须在 3-50 个字符之间', type: 'error' });
      return;
    }

    if (!password || password.length < 8) {
      show({ message: '密码长度不能少于 8 个字符', type: 'error' });
      return;
    }

    // 检查密码是否包含字母和数字
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    if (!hasLetter) {
      show({ message: '密码必须包含字母', type: 'error' });
      return;
    }
    if (!hasDigit) {
      show({ message: '密码必须包含数字', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      show({ message: '两次输入的密码不一致', type: 'error' });
      return;
    }

    const success = await register(username.trim(), password);
    if (success) {
      show({ message: '注册成功，请登录', type: 'success' });
      navigate('/login');
    }
  };

  // 加载中
  if (allowRegistration === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-banana-50 to-banana-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-banana-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 注册已关闭
  if (!allowRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-banana-50 to-banana-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">注册已关闭</h1>
          <p className="text-gray-500 mb-6">管理员已关闭用户注册功能，请联系管理员获取账户。</p>
          <Link to="/login">
            <Button variant="primary">返回登录</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-banana-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-banana-100 rounded-full mb-4">
            <span className="text-3xl">🍌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Banana Slides</h1>
          <p className="text-gray-500 mt-2">创建您的账户</p>
        </div>

        {/* 注册表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="用户名（3-50个字符）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10"
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码（至少8位，含字母和数字）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              autoComplete="new-password"
            />
          </div>

          {/* 注册按钮 */}
          <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                注册中...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <UserPlus className="w-4 h-4 mr-2" />
                注册
              </span>
            )}
          </Button>
        </form>

        {/* 登录链接 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            已有账户？{' '}
            <Link to="/login" className="text-banana-600 hover:text-banana-700 font-medium">
              立即登录
            </Link>
          </p>
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};
