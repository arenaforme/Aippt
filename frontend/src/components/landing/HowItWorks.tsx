/**
 * 使用流程展示
 * Vercel/Linear 风格 - 时间线布局 + 精致卡片
 */
import { motion } from 'framer-motion';
import { MessageSquare, Wand2, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';

const steps = [
  {
    number: '01',
    icon: MessageSquare,
    title: '输入想法',
    description: '用一句话描述你的演示主题，AI 理解你的意图',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    number: '02',
    icon: Wand2,
    title: 'AI 生成',
    description: '智能生成大纲、内容和精美配图',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    number: '03',
    icon: Eye,
    title: '预览调整',
    description: '实时预览效果，自由调整细节',
    gradient: 'from-orange-500 to-yellow-500',
  },
  {
    number: '04',
    icon: Download,
    title: '导出使用',
    description: '一键导出 PPTX 或 PDF 格式',
    gradient: 'from-green-500 to-emerald-500',
  },
];

export const HowItWorks = () => {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
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
            使用流程
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            简单四步，完成演示
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            从想法到成品，只需几分钟
          </p>
        </motion.div>

        {/* 步骤流程 - 时间线风格 */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="relative"
        >
          {/* 连接线 - 桌面端 */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-green-500/30" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className="relative"
                >
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="text-center"
                  >
                    {/* 步骤圆圈 */}
                    <div className="relative w-32 h-32 mx-auto mb-6">
                      {/* 光晕效果 */}
                      <div className={cn(
                        "absolute inset-2 rounded-full blur-xl opacity-40",
                        "bg-gradient-to-br",
                        step.gradient
                      )} />

                      {/* 外圈 - 毛玻璃 */}
                      <div className={cn(
                        "relative w-full h-full rounded-full",
                        "bg-white/60 dark:bg-white/5",
                        "backdrop-blur-xl",
                        "border border-white/40 dark:border-white/10",
                        "shadow-[0_8px_32px_rgb(0_0_0/0.08)]",
                        "flex items-center justify-center"
                      )}>
                        {/* 内圈 - 渐变 */}
                        <div className={cn(
                          "w-20 h-20 rounded-full",
                          "bg-gradient-to-br",
                          step.gradient,
                          "flex items-center justify-center",
                          "shadow-lg"
                        )}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      {/* 步骤数字 */}
                      <div className={cn(
                        "absolute -top-1 -right-1 w-8 h-8 rounded-full",
                        "bg-foreground text-background",
                        "flex items-center justify-center",
                        "text-xs font-bold shadow-lg",
                        "border-2 border-background"
                      )}>
                        {step.number}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-[200px] mx-auto">
                      {step.description}
                    </p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
