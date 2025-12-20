/**
 * 用户菜单组件
 * 显示当前用户信息和登出功能
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, ChevronDown, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      // 无论成功失败都跳转到登录页
      navigate('/login');
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
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg
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
                {isAdmin() && (
                  <span className="inline-flex items-center gap-1 text-xs text-banana-600 font-medium">
                    <Shield size={12} />
                    管理员
                  </span>
                )}
              </div>
            </div>
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
    </div>
  );
};
