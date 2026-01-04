/**
 * 营销首页导航栏
 * Vercel/Linear 风格 - 精致毛玻璃 + 微妙边框
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navLinks = [
  { id: 'features', label: '功能' },
  { id: 'pricing', label: '定价' },
  { id: 'faq', label: 'FAQ' },
];

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-background/60 backdrop-blur-xl border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.span
            className="text-2xl"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            🍌
          </motion.span>
          <span className="text-lg font-semibold text-foreground tracking-tight">
            AI演示眼
          </span>
        </Link>

        {/* 导航链接 - 居中 */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/50 transition-all duration-200"
              )}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* 登录/注册按钮 */}
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium hover:bg-muted/50"
            >
              登录
            </Button>
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              className={cn(
                "rounded-full px-4",
                "bg-foreground text-background hover:bg-foreground/90",
                "shadow-sm hover:shadow-md transition-all duration-200"
              )}
            >
              免费开始
            </Button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};
