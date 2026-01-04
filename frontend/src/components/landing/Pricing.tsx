/**
 * 定价套餐展示
 * Vercel/Linear 风格 - 精致卡片 + 推荐高亮
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlans, MembershipPlan } from '@/api/membership';
import { staggerContainer, staggerItem } from '@/lib/animations';

export const Pricing = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getPlans();
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

  const formatPrice = (plan: MembershipPlan) => {
    if (plan.price === 0) return '免费';
    return `¥${plan.price}`;
  };

  const getPeriodText = (plan: MembershipPlan) => {
    if (plan.period_type === 'monthly') return '/月';
    if (plan.period_type === 'yearly') return '/年';
    return '';
  };

  return (
    <section id="pricing" className="relative py-32 px-6 overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-6
                      text-sm font-medium text-primary
                      bg-primary/10 border border-primary/20 rounded-full"
          >
            定价方案
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            选择适合你的套餐
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            灵活的定价方案，满足不同需求
          </p>
        </motion.div>

        {/* 套餐卡片 */}
        {loading ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <PricingCards plans={plans} formatPrice={formatPrice} getPeriodText={getPeriodText} />
        )}
      </div>
    </section>
  );
};

interface PricingCardsProps {
  plans: MembershipPlan[];
  formatPrice: (plan: MembershipPlan) => string;
  getPeriodText: (plan: MembershipPlan) => string;
}

const PricingCards = ({ plans, formatPrice, getPeriodText }: PricingCardsProps) => (
  <motion.div
    variants={staggerContainer}
    initial="initial"
    whileInView="animate"
    viewport={{ once: true }}
    className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
  >
    {plans.map((plan) => {
      const isRecommended = plan.period_type === 'monthly';
      return (
        <motion.div
          key={plan.id}
          variants={staggerItem}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn("relative group", isRecommended && "lg:scale-105 z-10")}
        >
          {/* 推荐标签光晕 */}
          {isRecommended && (
            <>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-orange-500 to-pink-500
                             rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className={cn(
                "absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 z-20",
                "bg-gradient-to-r from-primary to-orange-500",
                "text-primary-foreground text-sm font-medium rounded-full",
                "shadow-lg flex items-center gap-1.5"
              )}>
                <Sparkles className="w-3.5 h-3.5" />
                推荐
              </div>
            </>
          )}

          {/* 卡片主体 */}
          <div className={cn(
            "relative h-full rounded-2xl p-6",
            isRecommended
              ? "bg-foreground text-background"
              : "bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10",
            "shadow-[0_8px_32px_rgb(0_0_0/0.08)]",
            "hover:shadow-[0_16px_48px_rgb(0_0_0/0.12)]",
            "transition-all duration-300"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              !isRecommended && "text-foreground"
            )}>
              {plan.name}
            </h3>

            <div className="mb-6">
              <span className={cn(
                "text-4xl font-bold",
                !isRecommended && "text-foreground"
              )}>
                {formatPrice(plan)}
              </span>
              <span className={isRecommended ? "text-background/70" : "text-muted-foreground"}>
                {getPeriodText(plan)}
              </span>
            </div>

            <ul className={cn(
              "space-y-3 mb-6 text-sm",
              isRecommended ? "text-background/80" : "text-muted-foreground"
            )}>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {plan.image_quota} 张图片生成{plan.period_type !== 'none' ? '/月' : ''}
              </li>
              {plan.premium_quota > 0 && (
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {plan.premium_quota} 次高级功能{plan.period_type !== 'none' ? '/月' : ''}
                </li>
              )}
              {plan.duration_days > 0 && (
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {plan.duration_days} 天有效期
                </li>
              )}
            </ul>

            <Link
              to="/register"
              className={cn(
                "block w-full py-3 text-center font-medium rounded-full",
                "transition-all duration-200",
                isRecommended
                  ? "bg-primary text-primary-foreground hover:brightness-110 shadow-lg"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              {plan.price === 0 ? '免费开始' : '立即订阅'}
            </Link>
          </div>
        </motion.div>
      );
    })}
  </motion.div>
);
