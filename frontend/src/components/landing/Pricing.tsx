/**
 * 定价套餐展示
 * 从后端 API 动态获取套餐信息
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlans, MembershipPlan } from '@/api/membership';

export const Pricing = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getPlans();
        // 按 sort_order 排序，只显示激活的套餐
        const activePlans = data
          .filter((p) => p.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
        setPlans(activePlans);
      } catch (error) {
        console.error('获取套餐失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // 格式化价格显示
  const formatPrice = (plan: MembershipPlan) => {
    if (plan.price === 0) return '免费';
    return `¥${plan.price}`;
  };

  // 获取周期文字
  const getPeriodText = (plan: MembershipPlan) => {
    if (plan.period_type === 'monthly') return '/月';
    if (plan.period_type === 'yearly') return '/年';
    return '';
  };

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-gray-900 mb-4">
            选择适合你的套餐
          </h2>
          <p className="text-xl text-gray-500">
            灵活的定价方案，满足不同需求
          </p>
        </div>

        {/* 套餐卡片 */}
        {loading ? (
          <div className="text-center text-gray-500">加载中...</div>
        ) : (
          <PricingCards plans={plans} formatPrice={formatPrice} getPeriodText={getPeriodText} />
        )}
      </div>
    </section>
  );
};

// 拆分卡片组件以保持文件简洁
interface PricingCardsProps {
  plans: MembershipPlan[];
  formatPrice: (plan: MembershipPlan) => string;
  getPeriodText: (plan: MembershipPlan) => string;
}

const PricingCards = ({ plans, formatPrice, getPeriodText }: PricingCardsProps) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
    {plans.map((plan) => {
      const isRecommended = plan.period_type === 'monthly';
      return (
        <div
          key={plan.id}
          className={`relative rounded-2xl p-6 ${
            isRecommended
              ? 'bg-gray-900 text-white shadow-2xl lg:scale-105'
              : 'bg-white border border-gray-200 shadow-lg'
          }`}
        >
          {isRecommended && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1
                            bg-banana-500 text-gray-900 text-sm font-medium rounded-full">
              推荐
            </div>
          )}

          <h3 className={`text-lg font-semibold mb-2 ${isRecommended ? 'text-white' : 'text-gray-900'}`}>
            {plan.name}
          </h3>

          <div className="mb-4">
            <span className={`text-3xl font-bold ${isRecommended ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(plan)}
            </span>
            <span className={isRecommended ? 'text-gray-300' : 'text-gray-500'}>
              {getPeriodText(plan)}
            </span>
          </div>

          <ul className={`space-y-2 mb-6 text-sm ${isRecommended ? 'text-gray-300' : 'text-gray-500'}`}>
            <li className="flex items-center gap-2">
              <span className="text-banana-500">✓</span>
              {plan.image_quota} 张图片生成{plan.period_type !== 'none' ? '/月' : ''}
            </li>
            {plan.premium_quota > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-banana-500">✓</span>
                {plan.premium_quota} 次高级功能{plan.period_type !== 'none' ? '/月' : ''}
              </li>
            )}
            {plan.duration_days > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-banana-500">✓</span>
                {plan.duration_days} 天有效期
              </li>
            )}
          </ul>

          <Link
            to="/register"
            className={`block w-full py-3 text-center font-medium rounded-full transition-colors ${
              isRecommended
                ? 'bg-banana-500 text-gray-900 hover:bg-banana-600'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {plan.price === 0 ? '免费开始' : '立即订阅'}
          </Link>
        </div>
      );
    })}
  </div>
);
