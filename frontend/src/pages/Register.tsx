/**
 * 注册页面
 * Vercel/Linear 风格 - 网格背景 + 毛玻璃卡片
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, User, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, useToast } from '@/components/shared';
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
        setAllowRegistration(false);
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

  // 背景组件
  const Background = () => (
    <div className="absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                     bg-gradient-to-b from-primary/20 via-primary/5 to-transparent
                     blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96
                     bg-gradient-to-t from-purple-500/10 to-transparent
                     blur-3xl rounded-full" />
    </div>
  );

  // 加载中
  if (allowRegistration === null) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <Background />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // 注册已关闭
  if (!allowRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <Background />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full max-w-md"
        >
          <div className={cn(
            "rounded-2xl p-8 text-center",
            "bg-white/60 dark:bg-white/5",
            "backdrop-blur-xl",
            "border border-white/40 dark:border-white/10",
            "shadow-[0_8px_32px_rgb(0_0_0/0.08)]"
          )}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
            >
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground mb-2">注册已关闭</h1>
            <p className="text-muted-foreground mb-6">
              管理员已关闭用户注册功能，请联系管理员获取账户。
            </p>
            <Link to="/login">
              <Button className={cn(
                "rounded-full px-6",
                "bg-foreground text-background",
                "hover:bg-foreground/90",
                "transition-all"
              )}>
                返回登录
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Background />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-full max-w-md"
      >
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
            <p className="text-muted-foreground">创建您的账户</p>
          </motion.div>

          {/* 注册表单 */}
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
                placeholder="用户名（3-50个字符）"
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
                placeholder="密码（至少8位，含字母和数字）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "pl-10 pr-10 h-11",
                  "bg-white/50 dark:bg-white/5",
                  "border-border/50 focus:border-primary",
                  "rounded-xl transition-all"
                )}
                autoComplete="new-password"
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

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
                              text-muted-foreground group-focus-within:text-primary
                              transition-colors" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "pl-10 h-11",
                  "bg-white/50 dark:bg-white/5",
                  "border-border/50 focus:border-primary",
                  "rounded-xl transition-all"
                )}
                autoComplete="new-password"
              />
            </div>

            {/* 注册按钮 */}
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
                  注册中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <UserPlus className="w-4 h-4 mr-2" />
                  注册
                </span>
              )}
            </Button>
          </motion.form>

          {/* 登录链接 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              已有账户？{' '}
              <Link
                to="/login"
                className="text-foreground font-medium hover:underline transition-colors"
              >
                立即登录
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
      <ToastContainer />
    </div>
  );
};
