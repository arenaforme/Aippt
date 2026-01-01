/**
 * 页脚组件
 * 版权信息、技术说明、开发品牌
 */

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 px-6 border-t border-gray-100">
      <div className="max-w-6xl mx-auto text-center">
        {/* 版权信息 */}
        <p className="text-gray-900 font-medium mb-2">
          © {currentYear} AI演示眼 版权所有
        </p>

        {/* 技术品牌 */}
        <p className="text-gray-500 text-sm mb-1">
          Powered by nano banana 🍌 AI
        </p>

        {/* 开发品牌 */}
        <p className="text-gray-400 text-xs">
          基于「蕉幻」开发
        </p>
      </div>
    </footer>
  );
};
