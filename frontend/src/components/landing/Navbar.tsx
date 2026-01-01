/**
 * 营销首页导航栏
 * 固定顶部，包含 Logo、导航链接和登录按钮
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold text-gray-900">
          AI演示眼
        </Link>

        {/* 导航链接 */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection('features')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            功能
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            定价
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            FAQ
          </button>
        </div>

        {/* 登录/注册按钮 */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            登录
          </Link>
          <Link
            to="/register"
            className="text-sm px-4 py-2 bg-banana-500 hover:bg-banana-600 text-gray-900
                       font-medium rounded-full transition-colors"
          >
            免费开始
          </Link>
        </div>
      </div>
    </nav>
  );
};
