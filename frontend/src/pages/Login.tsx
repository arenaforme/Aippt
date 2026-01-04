/**
 * 登录页面
 * Vercel/Linear 风格 - 网格背景 + 毛玻璃卡片
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, useToast } from '@/components/shared';
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Vercel 风格背景 */}
      <div className="absolute inset-0 -z-10">
        {/* 网格图案 */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                             linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
        {/* 光晕效果 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                       bg-gradient-to-b from-primary/20 via-primary/5 to-transparent
                       blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96
                       bg-gradient-to-t from-purple-500/10 to-transparent
                       blur-3xl rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-full max-w-md"
      >
        {/* 毛玻璃卡片 */}
        <div className={cn(
          "rounded-2xl p-8",
          "bg-white/60 dark:bg-white/5",
          "backdrop-blur-xl",
          "border border-white/40 dark:border-white/10",
          "shadow-[0_8px_32px_rgb(0_0_0/0.08)]"
        )}>
          {/* 返回首页 */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                       hover:text-foreground mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            返回首页
          </Link>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <motion.span
                className="text-3xl"
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                🍌
              </motion.span>
              <span className="text-xl font-semibold text-foreground">AI演示眼</span>
            </Link>
            <p className="text-muted-foreground">登录您的账户</p>
          </motion.div>

          {/* 登录表单 */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
                              text-muted-foreground group-focus-within:text-primary
                              transition-colors" />
              <Input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cn(
                  "pl-10 h-11",
                  "bg-white/50 dark:bg-white/5",
                  "border-border/50 focus:border-primary",
                  "rounded-xl transition-all"
                )}
                autoComplete="username"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
                              text-muted-foreground group-focus-within:text-primary
                              transition-colors" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "pl-10 pr-10 h-11",
                  "bg-white/50 dark:bg-white/5",
                  "border-border/50 focus:border-primary",
                  "rounded-xl transition-all"
                )}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                          text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 记住我 */}
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded
                            focus:ring-primary/20 transition-colors"
                />
                <span className="ml-2 text-sm text-muted-foreground
                                group-hover:text-foreground transition-colors">
                  记住我（7天）
                </span>
              </label>
            </div>

            {/* 登录按钮 - Vercel 风格 */}
            <Button
              type="submit"
              className={cn(
                "w-full h-11 rounded-full font-medium",
                "bg-foreground text-background",
                "hover:bg-foreground/90",
                "shadow-sm hover:shadow-md",
                "transition-all duration-200"
              )}
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
          </motion.form>

          {/* 注册链接 */}
          {allowRegistration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center"
            >
              <p className="text-sm text-muted-foreground">
                还没有账户？{' '}
                <Link
                  to="/register"
                  className="text-foreground font-medium hover:underline transition-colors"
                >
                  立即注册
                </Link>
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
      <ToastContainer />
    </div>
  );
};
