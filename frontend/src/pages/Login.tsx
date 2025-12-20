/**
 * 登录页面
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, useToast } from '@/components/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { getRegistrationStatus } from '@/api/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, setError } = useAuthStore();
  const { show, ToastContainer } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(false);

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

    if (!username.trim() || !password) {
      show({ message: '请输入用户名和密码', type: 'error' });
      return;
    }

    const success = await login(username.trim(), password, rememberMe);
    if (success) {
      show({ message: '登录成功', type: 'success' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-banana-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-banana-100 rounded-full mb-4">
            <span className="text-3xl">🍌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Banana Slides</h1>
          <p className="text-gray-500 mt-2">登录您的账户</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="用户名"
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
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* 记住我 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-banana-500 border-gray-300 rounded focus:ring-banana-500"
              />
              <span className="ml-2 text-sm text-gray-600">记住我（7天）</span>
            </label>
          </div>

          {/* 登录按钮 */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                登录中...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <LogIn className="w-4 h-4 mr-2" />
                登录
              </span>
            )}
          </Button>
        </form>

        {/* 注册链接 */}
        {allowRegistration && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{' '}
              <Link to="/register" className="text-banana-600 hover:text-banana-700 font-medium">
                立即注册
              </Link>
            </p>
          </div>
        )}
      </Card>
      <ToastContainer />
    </div>
  );
};
