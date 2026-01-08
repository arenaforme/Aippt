/**
 * 绑定手机号页面
 * 用于已登录但未绑定手机号的用户
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, LogOut } from 'lucide-react';
import { Button, Input, Card, useToast, SmsCodeInput } from '@/components/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { sendVerificationCode, bindPhone } from '@/api/endpoints';

export const BindPhone: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, needPhoneVerification, setNeedPhoneVerification, setUser, logout } = useAuthStore();
  const { show, ToastContainer } = useToast();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 如果未登录，跳转到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 如果已绑定手机号，跳转到首页
  useEffect(() => {
    if (isAuthenticated && !needPhoneVerification) {
      navigate('/');
    }
  }, [isAuthenticated, needPhoneVerification, navigate]);

  // 发送验证码处理
  const handleSendCode = async (phoneNum: string, purpose: string) => {
    try {
      const response = await sendVerificationCode(phoneNum, purpose as 'register' | 'bind_phone');
      return { success: response.success, message: response.message };
    } catch (err: any) {
      // 后端错误格式: { success: false, error: { code, message } }
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || '发送失败';
      return { success: false, message: errorMsg };
    }
  };

  // 提交绑定
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      show({ message: '请输入有效的手机号', type: 'error' });
      return;
    }
    // 验证验证码
    if (!code || code.length !== 6) {
      show({ message: '请输入6位验证码', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await bindPhone(phone, code);
      if (response.success) {
        show({ message: '手机号绑定成功', type: 'success' });
        // 更新用户信息和状态
        if (response.data?.user) {
          setUser(response.data.user);
        }
        setNeedPhoneVerification(false);
        navigate('/');
      } else {
        show({ message: response.message || '绑定失败', type: 'error' });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || '绑定失败，请稍后重试';
      show({ message: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-banana-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-banana-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-banana-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">绑定手机号</h1>
          <p className="text-gray-500 mt-2">
            {user?.username}，请绑定手机号以继续使用
          </p>
        </div>

        {/* 绑定表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 手机号输入 */}
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="tel"
              placeholder="手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={11}
              className="pl-10"
              autoComplete="tel"
            />
          </div>

          {/* 验证码输入 */}
          <SmsCodeInput
            phone={phone}
            purpose="bind_phone"
            onSendCode={handleSendCode}
            value={code}
            onChange={setCode}
          />

          {/* 提交按钮 */}
          <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                绑定中...
              </span>
            ) : (
              '确认绑定'
            )}
          </Button>

          {/* 返回登录链接 */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              使用其他账号登录
            </button>
          </div>
        </form>
      </Card>
      <ToastContainer />
    </div>
  );
};
