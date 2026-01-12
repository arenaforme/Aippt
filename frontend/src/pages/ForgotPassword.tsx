/**
 * 忘记密码页面
 * 三步流程：输入用户名 → 输入验证码 → 设置新密码
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, useToast } from '@/components/shared';
import { forgotPasswordSendCode, forgotPasswordReset } from '@/api/auth';

type Step = 'username' | 'code' | 'password' | 'success';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();

  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const handleSendCode = async () => {
    if (!username.trim()) {
      show({ message: '请输入用户名', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await forgotPasswordSendCode(username);
      if (response.data?.phone_hint) {
        setPhoneHint(response.data.phone_hint);
        setStep('code');
        startCountdown();
        show({ message: '验证码已发送', type: 'success' });
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorMsg = error.response?.data?.error?.message || '发送失败';
      if (errorCode === 'NO_PHONE') {
        show({ message: '该账户未绑定手机号，请联系管理员重置密码', type: 'error' });
      } else if (errorCode === 'USER_NOT_FOUND') {
        show({ message: '用户不存在', type: 'error' });
      } else {
        show({ message: errorMsg, type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 倒计时
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      await forgotPasswordSendCode(username);
      startCountdown();
      show({ message: '验证码已重新发送', type: 'success' });
    } catch (error: any) {
      show({ message: error.response?.data?.error?.message || '发送失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async () => {
    if (!code.trim() || code.length !== 6) {
      show({ message: '请输入6位验证码', type: 'error' });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      show({ message: '密码至少8位', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      show({ message: '两次输入的密码不一致', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      await forgotPasswordReset(username, code, newPassword);
      setStep('success');
      show({ message: '密码重置成功', type: 'success' });
    } catch (error: any) {
      show({ message: error.response?.data?.error?.message || '重置失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // 进入设置密码步骤
  const handleNextToPassword = () => {
    if (!code.trim() || code.length !== 6) {
      show({ message: '请输入6位验证码', type: 'error' });
      return;
    }
    setStep('password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50 flex items-center justify-center p-4">
      <ToastContainer />
      <Card className="w-full max-w-md p-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center text-gray-600 hover:text-banana-600">
            <ArrowLeft size={18} className="mr-1" />
            返回登录
          </Link>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">找回密码</h1>
          <p className="text-gray-500 mt-2">
            {step === 'username' && '请输入您的用户名'}
            {step === 'code' && `验证码已发送至 ${phoneHint}`}
            {step === 'password' && '请设置新密码'}
            {step === 'success' && '密码重置成功'}
          </p>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator currentStep={step} />

        {/* 步骤内容 */}
        {step === 'username' && (
          <UsernameStep
            username={username}
            setUsername={setUsername}
            onSubmit={handleSendCode}
            isLoading={isLoading}
          />
        )}
        {step === 'code' && (
          <CodeStep
            code={code}
            setCode={setCode}
            countdown={countdown}
            onResend={handleResendCode}
            onNext={handleNextToPassword}
            isLoading={isLoading}
          />
        )}
        {step === 'password' && (
          <PasswordStep
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onSubmit={handleResetPassword}
            isLoading={isLoading}
          />
        )}
        {step === 'success' && <SuccessStep onLogin={() => navigate('/login')} />}
      </Card>
    </div>
  );
};

// 步骤指示器组件
const StepIndicator: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
  const steps = [
    { key: 'username', label: '输入用户名' },
    { key: 'code', label: '验证身份' },
    { key: 'password', label: '设置密码' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= currentIndex
                  ? 'bg-banana-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span className="text-xs mt-1 text-gray-500">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-2 ${
                i < currentIndex ? 'bg-banana-500' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// 用户名输入步骤
const UsernameStep: React.FC<{
  username: string;
  setUsername: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}> = ({ username, setUsername, onSubmit, isLoading }) => (
  <div className="space-y-4">
    <Input
      label="用户名"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      placeholder="请输入您的用户名"
      onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
    />
    <Button variant="primary" className="w-full" onClick={onSubmit} loading={isLoading}>
      发送验证码
    </Button>
  </div>
);

// 验证码输入步骤
const CodeStep: React.FC<{
  code: string;
  setCode: (v: string) => void;
  countdown: number;
  onResend: () => void;
  onNext: () => void;
  isLoading: boolean;
}> = ({ code, setCode, countdown, onResend, onNext, isLoading }) => (
  <div className="space-y-4">
    <div>
      <Input
        label="验证码"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="请输入6位验证码"
        maxLength={6}
        onKeyDown={(e) => e.key === 'Enter' && onNext()}
      />
      <div className="mt-2 text-right">
        <button
          onClick={onResend}
          disabled={countdown > 0 || isLoading}
          className={`text-sm ${
            countdown > 0 ? 'text-gray-400' : 'text-banana-600 hover:text-banana-700'
          }`}
        >
          {countdown > 0 ? `${countdown}秒后重新发送` : '重新发送验证码'}
        </button>
      </div>
    </div>
    <Button variant="primary" className="w-full" onClick={onNext} loading={isLoading}>
      下一步
    </Button>
  </div>
);

// 密码设置步骤
const PasswordStep: React.FC<{
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}> = ({ newPassword, setNewPassword, confirmPassword, setConfirmPassword, onSubmit, isLoading }) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
        <div className="relative">
          <Input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">密码至少8位，必须包含字母和数字</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <Button variant="primary" className="w-full" onClick={onSubmit} loading={isLoading}>
        重置密码
      </Button>
    </div>
  );
};

// 成功步骤
const SuccessStep: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="text-center space-y-6">
    <div className="flex justify-center">
      <CheckCircle size={64} className="text-green-500" />
    </div>
    <p className="text-gray-600">您的密码已成功重置，请使用新密码登录</p>
    <Button variant="primary" className="w-full" onClick={onLogin}>
      返回登录
    </Button>
  </div>
);
