/**
 * 产品优势展示
 * Vercel/Linear 风格 - 简洁数据展示 + 微妙动效
 */
import { motion } from 'framer-motion';
import { Sparkles, Zap, Palette, FileOutput } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';

const advantages = [
  {
    icon: Sparkles,
    title: 'nano banana AI',
    description: '原生 AI 技术，深度理解你的表达意图',
    stat: '99%',
    statLabel: '内容准确率',
  },
  {
    icon: Zap,
    title: '快速高效',
    description: '几分钟完成传统数小时的工作',
    stat: '10x',
    statLabel: '效率提升',
  },
  {
    icon: Palette,
    title: 'AI 智能配图',
    description: '自动生成与内容匹配的精美插图',
    stat: '100+',
    statLabel: '风格模板',
  },
  {
    icon: FileOutput,
    title: '可编辑导出',
    description: '导出 PPTX/PDF，自由调整',
    stat: '3',
    statLabel: '导出格式',
  },
];

export const Advantages = () => {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* 背景 - 渐变分割 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/30 via-background to-background" />

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
            产品优势
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            为什么选择我们
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            强大的 AI 能力，让演示文稿制作变得简单
          </p>
        </motion.div>

        {/* 优势网格 */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {advantages.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="group relative"
              >
                <div className={cn(
                  "relative h-full rounded-2xl p-6",
                  "bg-white/60 dark:bg-white/5",
                  "backdrop-blur-xl",
                  "border border-white/40 dark:border-white/10",
                  "shadow-[0_4px_24px_rgb(0_0_0/0.04)]",
                  "hover:shadow-[0_8px_32px_rgb(0_0_0/0.08)]",
                  "hover:border-primary/20",
                  "transition-all duration-300"
                )}>
                  {/* 图标 */}
                  <div className={cn(
                    "w-10 h-10 rounded-lg mb-4",
                    "bg-primary/10",
                    "flex items-center justify-center",
                    "group-hover:bg-primary/20 transition-colors duration-300"
                  )}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  {/* 数据统计 */}
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-foreground">
                      {item.stat}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      {item.statLabel}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>

                  {/* 描述 */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
