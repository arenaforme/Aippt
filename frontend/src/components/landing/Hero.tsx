/**
 * Hero 首屏区域
 * Vercel/Linear 风格 - 渐变网格背景 + 光晕效果 + 精致产品展示
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fadeInUp, staggerContainer } from '@/lib/animations';

// 产品截图配置（使用 WebP 格式，压缩后仅 ~700KB）
const SCREENSHOTS = [
  { src: '/screenshots/product-1.webp', alt: '首页界面', description: '一句话描述，AI 智能生成' },
  { src: '/screenshots/product-2.webp', alt: '大纲编辑', description: 'AI 生成大纲，自由调整结构' },
  { src: '/screenshots/product-3.webp', alt: '内容编辑', description: '逐页编辑，精细化控制' },
  { src: '/screenshots/product-4.webp', alt: '幻灯片预览', description: '实时预览，所见即所得' },
  { src: '/screenshots/product-5.webp', alt: '图片生成', description: 'AI 配图，一键美化' },
  { src: '/screenshots/product-6.webp', alt: '导出功能', description: '多格式导出，灵活分享' },
  { src: '/screenshots/product-7.webp', alt: '历史版本', description: '版本管理，随时回溯' },
];

export const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SCREENSHOTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);
    setIsAutoPlaying(false);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SCREENSHOTS.length);
    setIsAutoPlaying(false);
  }, []);

  return (
    <section className="relative min-h-screen pt-24 pb-20 px-6 overflow-hidden">
      {/* Vercel 风格渐变网格背景 */}
      <div className="absolute inset-0 -z-10">
        {/* 网格图案 */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                             linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
        {/* 顶部渐变光晕 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px]
                       bg-gradient-to-b from-primary/20 via-primary/5 to-transparent
                       blur-3xl rounded-full" />
        {/* 左侧光晕 */}
        <div className="absolute top-1/4 -left-32 w-96 h-96
                       bg-gradient-to-r from-orange-500/20 to-transparent
                       blur-3xl rounded-full" />
        {/* 右侧光晕 */}
        <div className="absolute top-1/3 -right-32 w-96 h-96
                       bg-gradient-to-l from-purple-500/15 to-transparent
                       blur-3xl rounded-full" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-5xl mx-auto text-center"
      >
        {/* 标签徽章 */}
        <motion.div
          variants={fadeInUp}
          className="inline-flex items-center gap-2 px-4 py-2 mb-8
                    bg-primary/10 border border-primary/20 rounded-full
                    text-sm text-primary font-medium"
        >
          <Sparkles className="w-4 h-4" />
          <span>基于 nano banana 🍌 AI 技术</span>
        </motion.div>

        {/* 主标题 - Linear 风格大字体 */}
        <motion.h1
          variants={fadeInUp}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl
                    font-bold tracking-tight mb-8 leading-[1.1]"
        >
          <span className="text-foreground">AI 一键生成</span>
          <br />
          <span className="bg-gradient-to-r from-primary via-orange-500 to-pink-500
                         bg-clip-text text-transparent
                         bg-[length:200%_auto] animate-gradient">
            专业演示文稿
          </span>
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          variants={fadeInUp}
          className="text-lg sm:text-xl md:text-2xl text-muted-foreground
                    mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          告别繁琐的 PPT 制作，一句话描述你的想法，
          <br className="hidden sm:block" />
          AI 为你生成精美的演示文稿
        </motion.p>

        {/* CTA 按钮组 - Vercel 风格 */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <Link to="/register">
            <Button
              size="lg"
              className="h-12 px-8 text-base rounded-full
                        bg-foreground text-background hover:bg-foreground/90
                        shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.12)]
                        hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.16)]
                        transition-all duration-300"
            >
              免费开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base rounded-full
                        border-border/50 hover:border-border
                        hover:bg-muted/50 transition-all duration-300"
            >
              已有账号？登录
            </Button>
          </Link>
        </motion.div>

        {/* 产品截图轮播 - Linear 风格精致边框 */}
        <motion.div
          variants={fadeInUp}
          className="relative max-w-4xl mx-auto group"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* 外层光晕效果 */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-orange-500/30 to-pink-500/30
                         rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* 产品截图容器 - 带精致边框 */}
          <div className="relative rounded-xl overflow-hidden
                         border border-white/20 dark:border-white/10
                         bg-gradient-to-b from-white/80 to-white/40
                         dark:from-white/10 dark:to-white/5
                         backdrop-blur-sm
                         shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)]">
            {/* 顶部浏览器样式装饰条 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30
                           bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 bg-background/50 rounded-md max-w-xs mx-auto
                               flex items-center justify-center text-xs text-muted-foreground">
                  AI演示眼
                </div>
              </div>
            </div>

            {/* 截图内容 */}
            <div className="aspect-video bg-muted/50">
              <img
                src={SCREENSHOTS[currentIndex].src}
                alt={SCREENSHOTS[currentIndex].alt}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* 描述文字 */}
          <div className="mt-6 text-center">
            <span className="text-muted-foreground text-sm font-medium">
              {SCREENSHOTS[currentIndex].description}
            </span>
          </div>

          {/* 左右导航按钮 */}
          <button
            onClick={goToPrev}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 p-2.5",
              "bg-background/90 hover:bg-background rounded-full",
              "border border-border/50 shadow-lg",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "hover:scale-110"
            )}
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 p-2.5",
              "bg-background/90 hover:bg-background rounded-full",
              "border border-border/50 shadow-lg",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "hover:scale-110"
            )}
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>

          {/* 指示器 */}
          <div className="flex justify-center gap-2 mt-4">
            {SCREENSHOTS.map((_, index) => (
              <button
                key={index}
                onClick={() => { setCurrentIndex(index); setIsAutoPlaying(false); }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                )}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
