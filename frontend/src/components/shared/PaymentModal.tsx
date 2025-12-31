/**
 * 支付弹窗组件
 * 创建订单并跳转到 CBB 支付页面
 */
import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { Button, Card } from '@/components/shared';
import * as membershipApi from '@/api/membership';
import type { Order, MembershipPlan } from '@/api/membership';

interface PaymentModalProps {
  plan: MembershipPlan;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  plan,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'confirm' | 'paying' | 'success' | 'failed'>('confirm');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [countdown, setCountdown] = useState(0);

  // 创建订单并跳转支付
  const handlePay = async () => {
    setLoading(true);
    setError('');

    try {
      const newOrder = await membershipApi.createOrder(plan.id);
      setOrder(newOrder);

      if (newOrder.qr_code_url) {
        // 打开 CBB 支付页面
        window.open(newOrder.qr_code_url, '_blank');
        setStep('paying');
        // 计算倒计时
        if (newOrder.expires_at) {
          const expiresAt = new Date(newOrder.expires_at).getTime();
          const now = Date.now();
          setCountdown(Math.max(0, Math.floor((expiresAt - now) / 1000)));
        }
      } else if (newOrder.payment_error) {
        setError(newOrder.payment_error);
      } else {
        setError('获取支付链接失败');
      }
    } catch (err: any) {
      setError(err.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 轮询支付状态
  useEffect(() => {
    if (step !== 'paying' || !order) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await membershipApi.getOrderStatus(order.id);
        if (status.status === 'paid') {
          setStep('success');
          clearInterval(pollInterval);
          setTimeout(() => onSuccess(), 2000);
        } else if (status.status === 'expired' || status.status === 'cancelled') {
          setStep('failed');
          setError('订单已过期或已取消');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('查询支付状态失败:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [step, order, onSuccess]);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0 || step !== 'paying') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setStep('failed');
          setError('订单已过期');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, step]);

  // 格式化倒计时
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 取消订单
  const handleCancel = async () => {
    if (order && order.status === 'pending') {
      try {
        await membershipApi.cancelOrder(order.id);
      } catch (err) {
        console.error('取消订单失败:', err);
      }
    }
    onClose();
  };

  // 重新打开支付页面
  const handleReopenPayment = () => {
    if (order?.qr_code_url) {
      window.open(order.qr_code_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 relative">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4">购买会员</h2>

        {/* 套餐信息 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{plan.name}</span>
            <span className="text-2xl font-bold text-gray-900">¥{plan.price}</span>
          </div>
        </div>

        {/* 确认支付 */}
        {step === 'confirm' && (
          <>
            <p className="text-gray-600 text-sm mb-4">
              点击下方按钮将跳转到支付页面，您可以选择微信或支付宝完成支付。
            </p>

            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}

            <Button
              variant="primary"
              className="w-full"
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="ml-2">创建订单中...</span>
                </>
              ) : (
                '立即支付'
              )}
            </Button>
          </>
        )}

        {/* 支付中 - 等待用户在 CBB 页面完成支付 */}
        {step === 'paying' && (
          <div className="text-center">
            <div className="mb-4 py-6">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <ExternalLink size={32} className="text-blue-600" />
              </div>
              <p className="text-gray-800 font-medium mb-2">
                已打开支付页面
              </p>
              <p className="text-sm text-gray-500">
                请在新窗口中选择支付方式并完成支付
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Clock size={14} />
              <span>剩余时间：{formatCountdown(countdown)}</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
              <Loader2 size={16} className="animate-spin" />
              <span>等待支付完成...</span>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleCancel}
              >
                取消支付
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleReopenPayment}
              >
                重新打开支付页面
              </Button>
            </div>
          </div>
        )}

        {/* 支付成功 */}
        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">支付成功</h3>
            <p className="text-gray-600">会员已开通，即将刷新页面...</p>
          </div>
        )}

        {/* 支付失败 */}
        {step === 'failed' && (
          <div className="text-center py-8">
            <XCircle size={64} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">支付失败</h3>
            <p className="text-gray-600 mb-4">{error || '请重试'}</p>
            <Button variant="primary" onClick={() => setStep('confirm')}>
              重新支付
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentModal;
