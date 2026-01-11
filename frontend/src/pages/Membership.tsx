/**
 * 会员中心页面
 * 显示用户会员状态、配额信息和可购买套餐
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Crown, Zap, Image, Star, Clock, ChevronRight, Settings, FileText, Ban } from 'lucide-react';
import { Button, Card, Loading, useToast, UserMenu, PaymentModal } from '@/components/shared';
import { useAuthStore } from '@/store/useAuthStore';
import * as membershipApi from '@/api/membership';
import type { MembershipStatus, MembershipPlanWithPurchaseInfo, QuotaInfo } from '@/api/membership';

// 会员等级配置
const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  free: { label: '免费用户', color: 'text-gray-600', icon: <Star size={16} /> },
  basic: { label: '基础会员', color: 'text-blue-600', icon: <Crown size={16} /> },
  premium: { label: '高级会员', color: 'text-purple-600', icon: <Crown size={16} className="text-purple-600" /> },
  admin: { label: '管理员', color: 'text-red-600', icon: <Crown size={16} className="text-red-600" /> },
};

// 套餐周期配置
const PERIOD_CONFIG: Record<string, string> = {
  none: '',
  monthly: '/月',
  yearly: '/年',
};

export const Membership: React.FC = () => {
  const navigate = useNavigate();
  const { show } = useToast();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [plans, setPlans] = useState<MembershipPlanWithPurchaseInfo[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanWithPurchaseInfo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, quotaData, plansData] = await Promise.all([
        membershipApi.getMembershipStatus(),
        membershipApi.getQuota(),
        membershipApi.getPlansWithPurchaseInfo(),
      ]);
      setStatus(statusData);
      setQuota(quotaData);
      setPlans(plansData);
    } catch (error: any) {
      show({ message: error.message || '加载会员信息失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 格式化会员到期日期（只显示日期，空值显示"永久"）
  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return '永久';
    // 如果时间字符串不带时区信息，假设为 UTC 时间
    const utcDateStr = dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)
      ? dateStr
      : dateStr + 'Z';
    const date = new Date(utcDateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 获取等级配置
  const getLevelConfig = (level: string) => {
    return LEVEL_CONFIG[level] || LEVEL_CONFIG.free;
  };

  // 处理购买
  const handleBuy = (plan: MembershipPlanWithPurchaseInfo) => {
    if (!plan.purchase_info.can_purchase) {
      show({ message: plan.purchase_info.error || '无法购买此套餐', type: 'error' });
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  // 获取购买按钮文本
  const getButtonText = (plan: MembershipPlanWithPurchaseInfo) => {
    if (!plan.purchase_info.can_purchase) {
      return '无法购买';
    }
    switch (plan.purchase_info.operation_type) {
      case 'renew':
        return '续费';
      case 'upgrade':
        return '升级';
      case 'plan_change':
        return '变更套餐';
      default:
        return '立即购买';
    }
  };

  // 支付成功回调
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    show({ message: '支付成功，会员已开通！', type: 'success' });
    loadData(); // 刷新数据
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home size={18} />
              <span className="ml-1">首页</span>
            </Button>
            <h1 className="text-lg font-semibold text-gray-800">会员中心</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/membership/plans')}>
                <Settings size={16} />
                <span className="ml-1">套餐管理</span>
              </Button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 当前会员状态 */}
        {status && (
          <Card className="mb-8 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getLevelConfig(status.level).icon}
                  <span className={`text-xl font-bold ${getLevelConfig(status.level).color}`}>
                    {status.membership_display}
                  </span>
                </div>
                {status.expires_at && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock size={14} />
                    到期时间：{formatExpiryDate(status.expires_at)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* 配额信息 */}
        {quota && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Image size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">图片生成配额</h3>
                  <p className="text-sm text-gray-500">用于生成 PPT 页面图片</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-600">{quota.image_quota}</div>
              <p className="text-sm text-gray-500 mt-1">剩余可用</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">高级功能配额</h3>
                  <p className="text-sm text-gray-500">用于可编辑PPT导出、PDF转换等</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-600">{quota.premium_quota}</div>
              <p className="text-sm text-gray-500 mt-1">剩余可用</p>
            </Card>
          </div>
        )}

        {/* 套餐列表 */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">升级套餐</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-5 relative ${
                plan.level === 'premium' ? 'border-2 border-purple-500' : ''
              }`}
            >
              {plan.level === 'premium' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                  推荐
                </div>
              )}
              <div className="mb-3">
                <h3 className="text-base font-bold text-gray-800">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-gray-900">¥{plan.price}</span>
                  <span className="text-gray-500 text-sm">{PERIOD_CONFIG[plan.period_type]}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-xs text-gray-600">
                  <Image size={14} className="text-blue-500" />
                  <span>{plan.image_quota} 张图片{plan.period_type !== 'none' ? '/月' : ''}</span>
                </li>
                {plan.premium_quota > 0 && (
                  <li className="flex items-center gap-2 text-xs text-gray-600">
                    <Zap size={14} className="text-purple-500" />
                    <span>{plan.premium_quota} 次高级功能{plan.period_type !== 'none' ? '/月' : ''}</span>
                  </li>
                )}
                <li className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={14} className="text-gray-400" />
                  <span>{plan.duration_days} 天有效期</span>
                </li>
              </ul>

              <Button
                variant={!plan.purchase_info.can_purchase ? 'secondary' : plan.level === 'premium' ? 'primary' : 'outline'}
                className={`w-full ${!plan.purchase_info.can_purchase ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => handleBuy(plan)}
                disabled={!plan.purchase_info.can_purchase}
              >
                {!plan.purchase_info.can_purchase && <Ban size={16} className="mr-1" />}
                {getButtonText(plan)}
                {plan.purchase_info.can_purchase && <ChevronRight size={16} />}
              </Button>
              {/* 购买提示信息 */}
              {plan.purchase_info.message && (
                <p className={`text-xs mt-2 text-center ${plan.purchase_info.can_purchase ? 'text-gray-500' : 'text-red-500'}`}>
                  {plan.purchase_info.message}
                </p>
              )}
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <Card className="p-8 text-center text-gray-500">
            暂无可购买的套餐
          </Card>
        )}

        {/* 订单记录入口 */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/orders')}
          >
            <FileText size={16} />
            <span className="ml-1">查看订单记录</span>
          </Button>
        </div>
      </main>

      {/* 支付弹窗 */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Membership;

