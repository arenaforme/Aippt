/**
 * FAQ 常见问题
 * Vercel/Linear 风格 - 精致手风琴 + 微妙动效
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: '生成的 PPT 质量如何？',
    answer:
      'AI 会根据你的内容智能生成专业布局和配图。生成效果取决于输入内容的质量和具体程度，建议提供清晰的主题描述以获得更好的结果。你可以在预览阶段对内容进行调整和修改。',
  },
  {
    question: '支持哪些导出格式？',
    answer:
      '支持导出为 PPTX 和 PDF 格式。基础会员可导出图片版 PPTX 和 PDF；高级会员可导出可编辑的 PPTX（支持在 PowerPoint、WPS 等软件中继续编辑），并可使用 PDF 转可编辑 PPTX 工具。',
  },
  {
    question: '免费版有什么限制？',
    answer:
      '免费版提供有限的图片生成配额，可以体验 PPT 生成的基本流程。如需更多配额或高级功能（如可编辑 PPTX 导出），可以升级到付费套餐。',
  },
  {
    question: '如何升级会员？',
    answer:
      '登录后进入会员中心，选择适合的套餐进行购买即可。支持微信和支付宝支付。',
  },
  {
    question: '生成的内容可以商用吗？',
    answer:
      '是的，你生成的演示文稿内容归你所有，可以用于商业用途。',
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-32 px-6 overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="max-w-3xl mx-auto">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-6
                      text-sm font-medium text-primary
                      bg-primary/10 border border-primary/20 rounded-full"
          >
            常见问题
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            有疑问？
          </h2>
          <p className="text-xl text-muted-foreground">
            这里可能有你想要的答案
          </p>
        </motion.div>

        {/* FAQ 列表 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => toggleFaq(index)}
              index={index}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

interface FAQItemProps {
  faq: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

const FAQItem = ({ faq, isOpen, onToggle, index }: FAQItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className="group"
  >
    <div className={cn(
      "rounded-2xl overflow-hidden",
      "bg-white/60 dark:bg-white/5",
      "backdrop-blur-xl",
      "border border-white/40 dark:border-white/10",
      "shadow-[0_4px_16px_rgb(0_0_0/0.04)]",
      "hover:shadow-[0_8px_32px_rgb(0_0_0/0.08)]",
      "transition-all duration-300",
      isOpen && "border-primary/20"
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full px-6 py-5 flex items-center justify-between text-left",
          "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
          "transition-colors duration-200"
        )}
      >
        <span className="font-medium text-foreground pr-4">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            "bg-muted/50 group-hover:bg-muted transition-colors"
          )}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="px-6 pb-5 text-muted-foreground leading-relaxed border-t border-border/30">
              <div className="pt-4">
                {faq.answer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
);
