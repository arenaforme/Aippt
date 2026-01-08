import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils';
import { Button } from './Button';

interface SmsCodeInputProps {
  phone: string;
  purpose: 'register' | 'bind_phone';
  onSendCode: (phone: string, purpose: string) => Promise<{ success: boolean; message: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const SmsCodeInput: React.FC<SmsCodeInputProps> = ({
  phone,
  purpose,
  onSendCode,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    if (!phone || countdown > 0 || sending) return;

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setSendError('请输入有效的手机号');
      return;
    }

    setSending(true);
    setSendError('');

    try {
      const result = await onSendCode(phone, purpose);
      if (result.success) {
        setCountdown(60);
      } else {
        setSendError(result.message);
      }
    } catch {
      setSendError('发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }, [phone, purpose, countdown, sending, onSendCode]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        验证码
      </label>
      <div className="flex gap-3">
        <input
          type="text"
          maxLength={6}
          placeholder="请输入6位验证码"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          disabled={disabled}
          className={cn(
            'flex-1 h-10 px-4 rounded-lg border border-gray-200 bg-white',
            'focus:outline-none focus:ring-2 focus:ring-banana-500 focus:border-transparent',
            'placeholder:text-gray-400 transition-all',
            (error || sendError) && 'border-red-500 focus:ring-red-500',
            disabled && 'bg-gray-100 cursor-not-allowed'
          )}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleSendCode}
          disabled={!phone || countdown > 0 || sending || disabled}
          className="whitespace-nowrap min-w-[120px]"
        >
          {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
        </Button>
      </div>
      {(error || sendError) && (
        <p className="mt-1 text-sm text-red-500">{error || sendError}</p>
      )}
    </div>
  );
};
