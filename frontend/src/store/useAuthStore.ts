/**
 * 认证状态管理 Store
 * 使用 Zustand 管理用户登录状态、Token 和用户信息
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '@/api/auth';

// 用户信息类型
export interface User {
  id: string;
  username: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  created_at?: string;
  last_login_at?: string;
}

// 认证状态接口
interface AuthState {
  // 状态
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;

  // 认证操作
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;

  // 工具方法
  isAdmin: () => boolean;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Setters
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setUser: (user) => set({ user }),
      setError: (error) => set({ error }),

      // 登录
      login: async (username, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(username, password, rememberMe);
          if (response.data?.token && response.data?.user) {
            set({
              token: response.data.token,
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          throw new Error(response.message || '登录失败');
        } catch (error: any) {
          const errorMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message || '登录失败';
          set({ error: errorMsg, isLoading: false });
          return false;
        }
      },

      // 注册
      register: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(username, password);
          if (response.data?.user) {
            set({ isLoading: false });
            return true;
          }
          throw new Error(response.message || '注册失败');
        } catch (error: any) {
          const errorMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message || '注册失败';
          set({ error: errorMsg, isLoading: false });
          return false;
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.warn('登出请求失败，但仍清除本地状态');
        }
        get().clearAuth();
      },

      // 获取当前用户信息
      fetchCurrentUser: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await authApi.getCurrentUser();
          if (response.data?.user) {
            set({ user: response.data.user, isLoading: false });
          }
        } catch (error: any) {
          // Token 无效，清除认证状态
          if (error.response?.status === 401) {
            get().clearAuth();
          }
          set({ isLoading: false });
        }
      },

      // 检查认证状态
      checkAuth: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await authApi.getCurrentUser();
          if (response.data?.user) {
            set({ user: response.data.user, isAuthenticated: true });
            return true;
          }
          get().clearAuth();
          return false;
        } catch (error) {
          get().clearAuth();
          return false;
        }
      },

      // 判断是否为管理员
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      // 清除认证状态
      clearAuth: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
