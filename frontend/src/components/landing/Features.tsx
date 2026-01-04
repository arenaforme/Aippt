/**
 * 核心功能展示
 * Vercel/Linear 风格 - Bento Grid 布局 + 精致毛玻璃卡片
 */
import { motion } from 'framer-motion';
import { Lightbulb, FileText, PenLine, Sparkles, Palette, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';

const features = [
  {
    icon: Lightbulb,
    title: '一句话生成',
    description: '输入想法，AI 自动生成完整 PPT 大纲和内容',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: FileText,
    title: '从大纲生成',
    description: '粘贴现有大纲，智能解析并生成精美幻灯片',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: PenLine,
    title: '从描述生成',
    description: '详细描述每页内容，获得精准定制的演示文稿',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Sparkles,
    title: 'AI 智能配图',
    description: '自动生成与内容匹配的精美插图',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Palette,
    title: '多样模板',
    description: '丰富的专业模板，一键切换风格',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Download,
    title: '灵活导出',
    description: '支持 PPTX、PDF 多格式导出',
    gradient: 'from-indigo-500 to-violet-500',
  },
];

export const Features = () => {
  return (
    <section id="features" className="relative py-32 px-6 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px]
                       bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px]
                       bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 标题区域 */}
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
            核心功能
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            多种创建方式
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            选择最适合你的方式，快速生成专业演示文稿
          </p>
        </motion.div>

        {/* 统一网格布局 */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="group relative"
              >
                {/* 悬停光晕 */}
                <div className={cn(
                  "absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-50",
                  "bg-gradient-to-r transition-opacity duration-500 blur-md",
                  feature.gradient
                )} />

                {/* 卡片主体 */}
                <div className={cn(
                  "relative h-full rounded-2xl p-6",
                  "bg-white/60 dark:bg-white/5",
                  "backdrop-blur-xl",
                  "border border-white/40 dark:border-white/10",
                  "shadow-[0_8px_32px_rgb(0_0_0/0.04)]",
                  "hover:shadow-[0_16px_48px_rgb(0_0_0/0.08)]",
                  "hover:border-white/60 dark:hover:border-white/20",
                  "transition-all duration-300"
                )}>
                  {/* 图标 */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl mb-4",
                    "bg-gradient-to-br",
                    feature.gradient,
                    "flex items-center justify-center",
                    "shadow-lg",
                    "group-hover:scale-110 transition-transform duration-300"
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* 标题 */}
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>

                  {/* 描述 */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
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
