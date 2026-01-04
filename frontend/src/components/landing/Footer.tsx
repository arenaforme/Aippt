/**
 * 页脚组件
 * Vercel/Linear 风格 - 简洁优雅
 */
import { motion } from 'framer-motion';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-16 px-6">
      {/* 渐变分割线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto text-center"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <motion.span
            className="text-2xl"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            🍌
          </motion.span>
          <span className="text-lg font-semibold text-foreground">
            AI演示眼
          </span>
        </div>

        {/* 版权信息 */}
        <p className="text-muted-foreground text-sm mb-2">
          © {currentYear} AI演示眼 版权所有
        </p>

        {/* 技术品牌 */}
        <p className="text-muted-foreground/60 text-xs">
          Powered by{' '}
          <span className="inline-flex items-center gap-1">
            nano banana
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block"
            >
              🍌
            </motion.span>
            AI
          </span>
          {' · '}基于「蕉幻」开发
        </p>
      </motion.div>
    </footer>
  );
};
