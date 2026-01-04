/**
 * 会员中心页面
 * 显示用户会员状态、配额信息和可购买套餐
 * 设计规范：毛玻璃卡片 + 渐变背景 + Spring 动画
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Crown, Zap, Image, Star, Clock, ChevronRight, Settings, FileText, Ban, Sparkles } from 'lucide-react';
import { Button, Card, Loading, useToast, UserMenu, PaymentModal } from '@/components/shared';
import { useAuthStore } from '@/store/useAuthStore';
import * as membershipApi from '@/api/membership';
import type { MembershipStatus, MembershipPlanWithPurchaseInfo, QuotaInfo } from '@/api/membership';
import { staggerContainer, staggerItem } from '@/lib/animations';

// 会员等级配置
const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  free: { label: '免费用户', color: 'text-muted-foreground', icon: <Star size={16} /> },
  basic: { label: '基础会员', color: 'text-blue-500', icon: <Crown size={16} /> },
  premium: { label: '高级会员', color: 'text-purple-500', icon: <Crown size={16} className="text-purple-500" /> },
  admin: { label: '管理员', color: 'text-red-500', icon: <Crown size={16} className="text-red-500" /> },
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

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '永久';
    const date = new Date(dateStr);
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
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background
                      flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background
                    relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 - 毛玻璃效果 */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home size={18} />
              <span className="ml-1">首页</span>
            </Button>
            <h1 className="text-lg font-semibold text-foreground">会员中心</h1>
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
        {/* 当前会员状态 - 毛玻璃卡片 */}
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className="mb-8 p-6 bg-white/80 dark:bg-white/5 backdrop-blur-xl
                            border border-white/20 dark:border-white/10
                            shadow-[0_8px_32px_rgb(0_0_0/0.08)] rounded-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getLevelConfig(status.level).icon}
                    <span className={`text-xl font-bold ${getLevelConfig(status.level).color}`}>
                      {status.membership_display}
                    </span>
                  </div>
                  {status.expires_at && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock size={14} />
                      到期时间：{formatDate(status.expires_at)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 配额信息 - 带渐变图标背景 */}
        {quota && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            <Card className="p-6 bg-white/80 dark:bg-white/5 backdrop-blur-xl
                            border border-white/20 dark:border-white/10
                            shadow-[0_8px_32px_rgb(0_0_0/0.08)] rounded-2xl
                            hover:shadow-[0_16px_48px_rgb(0_0_0/0.12)] transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-500/5
                               rounded-xl flex items-center justify-center shadow-lg">
                  <Image size={24} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">图片生成配额</h3>
                  <p className="text-sm text-muted-foreground">用于生成 PPT 页面图片</p>
                </div>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600
                             bg-clip-text text-transparent">{quota.image_quota}</div>
              <p className="text-sm text-muted-foreground mt-1">剩余可用</p>
            </Card>

            <Card className="p-6 bg-white/80 dark:bg-white/5 backdrop-blur-xl
                            border border-white/20 dark:border-white/10
                            shadow-[0_8px_32px_rgb(0_0_0/0.08)] rounded-2xl
                            hover:shadow-[0_16px_48px_rgb(0_0_0/0.12)] transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-500/5
                               rounded-xl flex items-center justify-center shadow-lg">
                  <Zap size={24} className="text-purple-500" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">高级功能配额</h3>
                  <p className="text-sm text-muted-foreground">用于可编辑PPT导出、PDF转换等</p>
                </div>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-600
                             bg-clip-text text-transparent">{quota.premium_quota}</div>
              <p className="text-sm text-muted-foreground mt-1">剩余可用</p>
            </Card>
          </motion.div>
        )}

        {/* 套餐列表标题 */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-foreground mb-4"
        >
          升级套餐
        </motion.h2>

        {/* 套餐卡片 - 带推荐光晕 */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {plans.map((plan) => {
            const isRecommended = plan.level === 'premium';
            return (
              <motion.div
                key={plan.id}
                variants={staggerItem}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`relative group ${isRecommended ? 'z-10' : ''}`}
              >
                {/* 推荐标签光晕 */}
                {isRecommended && (
                  <>
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500
                                   rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5
                                   bg-gradient-to-r from-purple-500 to-pink-500
                                   text-white text-sm font-medium rounded-full
                                   shadow-[0_4px_16px_rgb(168_85_247/0.4)]
                                   flex items-center gap-1.5 z-20">
                      <Sparkles className="w-3.5 h-3.5" />
                      推荐
                    </div>
                  </>
                )}

                <Card className={`relative h-full p-5 rounded-2xl transition-all duration-300
                                ${isRecommended
                                  ? 'bg-foreground text-background'
                                  : 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10'
                                }
                                shadow-[0_8px_32px_rgb(0_0_0/0.08)]
                                group-hover:shadow-[0_16px_48px_rgb(0_0_0/0.12)]`}>
                  <div className="mb-3">
                    <h3 className={`text-base font-bold ${isRecommended ? '' : 'text-foreground'}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className={`text-2xl font-bold ${isRecommended ? '' : 'text-foreground'}`}>
                        ¥{plan.price}
                      </span>
                      <span className={isRecommended ? 'text-background/70' : 'text-muted-foreground'}>
                        {PERIOD_CONFIG[plan.period_type]}
                      </span>
                    </div>
                  </div>

                  <ul className={`space-y-2 mb-4 ${isRecommended ? 'text-background/80' : 'text-muted-foreground'}`}>
                    <li className="flex items-center gap-2 text-xs">
                      <Image size={14} className={isRecommended ? 'text-blue-300' : 'text-blue-500'} />
                      <span>{plan.image_quota} 张图片{plan.period_type !== 'none' ? '/月' : ''}</span>
                    </li>
                    {plan.premium_quota > 0 && (
                      <li className="flex items-center gap-2 text-xs">
                        <Zap size={14} className={isRecommended ? 'text-purple-300' : 'text-purple-500'} />
                        <span>{plan.premium_quota} 次高级功能{plan.period_type !== 'none' ? '/月' : ''}</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-xs">
                      <Clock size={14} className={isRecommended ? 'text-background/60' : 'text-muted-foreground'} />
                      <span>{plan.duration_days} 天有效期</span>
                    </li>
                  </ul>

                  <Button
                    variant={!plan.purchase_info.can_purchase ? 'secondary' : isRecommended ? 'primary' : 'outline'}
                    className={`w-full rounded-xl transition-all duration-200
                              ${!plan.purchase_info.can_purchase ? 'opacity-60 cursor-not-allowed' : ''}
                              ${isRecommended && plan.purchase_info.can_purchase
                                ? 'bg-primary text-primary-foreground hover:shadow-[0_4px_16px_rgb(168_85_247/0.3)]'
                                : ''
                              }`}
                    onClick={() => handleBuy(plan)}
                    disabled={!plan.purchase_info.can_purchase}
                  >
                    {!plan.purchase_info.can_purchase && <Ban size={16} className="mr-1" />}
                    {getButtonText(plan)}
                    {plan.purchase_info.can_purchase && <ChevronRight size={16} />}
                  </Button>

                  {/* 购买提示信息 */}
                  {plan.purchase_info.message && (
                    <p className={`text-xs mt-2 text-center
                                 ${plan.purchase_info.can_purchase
                                   ? (isRecommended ? 'text-background/60' : 'text-muted-foreground')
                                   : 'text-red-500'
                                 }`}>
                      {plan.purchase_info.message}
                    </p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {plans.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground
                          bg-white/80 dark:bg-white/5 backdrop-blur-xl
                          border border-white/20 dark:border-white/10 rounded-2xl">
            暂无可购买的套餐
          </Card>
        )}

        {/* 订单记录入口 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/orders')}
            className="hover:bg-muted/50"
          >
            <FileText size={16} />
            <span className="ml-1">查看订单记录</span>
          </Button>
        </motion.div>
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
