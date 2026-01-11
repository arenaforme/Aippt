/**
 * AI演示眼 - 营销首页
 * Apple 风格设计，展示产品特点和定价
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Advantages } from '@/components/landing/Advantages';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';
import { NotificationPopup } from '@/components/shared';

export const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // 已登录用户自动跳转到应用
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Advantages />
        <HowItWorks />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
      {/* 通知弹窗 */}
      <NotificationPopup />
    </div>
  );
};
