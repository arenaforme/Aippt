/**
 * 强制修改密码弹窗组件
 * 首次登录时强制用户修改密码，不允许关闭
 */
import React, { useState } from 'react';
import { Key, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { useToast } from './Toast';
import { useAuthStore } from '@/store/useAuthStore';
import { changePassword } from '@/api/auth';

export const ForcePasswordChangeModal: React.FC = () => {
  const { mustChangePassword, setMustChangePassword, user } = useAuthStore();
  const { show, ToastContainer } = useToast();

  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!mustChangePassword) return null;

  const handleSubmit = async () => {
    const { oldPassword, newPassword, confirmPassword } = form;

    // 验证表单
    if (!oldPassword || !newPassword || !confirmPassword) {
      show({ message: '请填写所有密码字段', type: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      show({ message: '新密码长度不能少于 8 个字符', type: 'error' });
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasDigit) {
      show({ message: '新密码必须包含字母和数字', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      show({ message: '两次输入的新密码不一致', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      show({ message: '密码修改成功', type: 'success' });
      // 清除强制修改密码标志
      setMustChangePassword(false);
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || '修改失败';
      show({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={true}
        onClose={() => {}} // 不允许关闭
        title="首次登录 - 请修改密码"
        size="sm"
        hideCloseButton
      >
        <div className="space-y-4">
          {/* 提示信息 */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">安全提示</p>
              <p className="mt-1">
                您的账户是由管理员创建的，为了账户安全，请先修改初始密码后再继续使用系统。
              </p>
            </div>
          </div>

          <Input
            label="当前密码"
            type={showPasswords ? 'text' : 'password'}
            placeholder="请输入管理员提供的初始密码"
            value={form.oldPassword}
            onChange={(e) => setForm(prev => ({ ...prev, oldPassword: e.target.value }))}
          />
          <Input
            label="新密码"
            type={showPasswords ? 'text' : 'password'}
            placeholder="至少8位，含字母和数字"
            value={form.newPassword}
            onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
          />
          <Input
            label="确认新密码"
            type={showPasswords ? 'text' : 'password'}
            placeholder="再次输入新密码"
            value={form.confirmPassword}
            onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />

          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="mr-2"
              />
              {showPasswords ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
              显示密码
            </label>
          </div>

          <p className="text-xs text-gray-500">
            密码要求：至少 8 个字符，必须包含字母和数字
          </p>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              <Key size={16} className="mr-2" />
              {isSubmitting ? '修改中...' : '确认修改密码'}
            </Button>
          </div>
        </div>
      </Modal>
      <ToastContainer />
    </>
  );
};
