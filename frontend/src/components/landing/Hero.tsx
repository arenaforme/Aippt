/**
 * Hero 首屏区域
 * Apple 风格大标题居中，突出 nano banana AI 技术
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const scrollToFeatures = () => {
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* 主标题 */}
        <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 tracking-tight mb-6">
          AI 一键生成
          <br />
          专业演示文稿
        </h1>

        {/* 副标题 - 突出 nano banana */}
        <p className="text-xl md:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto">
          基于 nano banana 🍌 AI，一句话生成精美 PPT
        </p>

        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="px-8 py-3 bg-banana-500 hover:bg-banana-600 text-gray-900
                       font-medium rounded-full text-lg transition-colors shadow-yellow"
          >
            免费开始
          </Link>
          <button
            onClick={scrollToFeatures}
            className="px-8 py-3 text-gray-600 hover:text-gray-900
                       font-medium text-lg transition-colors flex items-center gap-2"
          >
            了解更多
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 产品截图轮播 */}
        <div
          className="relative max-w-3xl mx-auto group"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-gray-100">
            <div className="aspect-video">
              <img
                src={SCREENSHOTS[currentIndex].src}
                alt={SCREENSHOTS[currentIndex].alt}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* 描述文字 */}
          <div className="mt-4 text-center">
            <span className="text-gray-500 text-sm">{SCREENSHOTS[currentIndex].description}</span>
          </div>

          {/* 左右导航按钮 */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white
              rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white
              rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={20} className="text-gray-700" />
          </button>

          {/* 指示器 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {SCREENSHOTS.map((_, index) => (
              <button
                key={index}
                onClick={() => { setCurrentIndex(index); setIsAutoPlaying(false); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex ? 'bg-banana-500 w-4' : 'bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>

          {/* 装饰性阴影 */}
          <div
            className="absolute -inset-4 bg-gradient-to-r from-banana-100/50 to-banana-500/20
                        rounded-3xl -z-10 blur-2xl"
          />
        </div>
      </div>
    </section>
  );
};
