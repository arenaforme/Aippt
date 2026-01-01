/**
 * 路由守卫组件
 * 用于保护需要登录才能访问的路由
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const location = useLocation();
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // 如果已经有 token，验证其有效性
      if (isAuthenticated) {
        await checkAuth();
      }
      setIsChecking(false);
    };
    verifyAuth();
  }, []);

  // 正在检查认证状态
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-banana-50 to-banana-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-banana-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 未登录，跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 需要管理员权限但用户不是管理员
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

/**
 * 公开路由组件
 * 已登录用户访问登录/注册页时自动跳转到首页
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // 如果已登录，跳转到之前的页面或应用首页
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/app';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
