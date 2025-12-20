/**
 * 认证相关 API 端点
 */
import { apiClient } from './client';
import type { ApiResponse } from '@/types';

// 登录
export const login = async (
  username: string,
  password: string,
  rememberMe: boolean = false
): Promise<ApiResponse> => {
  const response = await apiClient.post('/api/auth/login', {
    username,
    password,
    remember_me: rememberMe,
  });
  return response.data;
};

// 注册
export const register = async (
  username: string,
  password: string
): Promise<ApiResponse> => {
  const response = await apiClient.post('/api/auth/register', {
    username,
    password,
  });
  return response.data;
};

// 登出
export const logout = async (): Promise<ApiResponse> => {
  const response = await apiClient.post('/api/auth/logout');
  return response.data;
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<ApiResponse> => {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};

// 获取注册开关状态
export const getRegistrationStatus = async (): Promise<ApiResponse> => {
  const response = await apiClient.get('/api/auth/registration-status');
  return response.data;
};
