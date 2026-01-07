/**
 * 页脚组件
 * 版权信息、技术说明、开发品牌、版本号、用户协议
 */

import { useState } from 'react';
import { ChangelogModal } from '@/components/shared/ChangelogModal';
import { UserAgreementModal } from '@/components/shared/UserAgreementModal';
import { changelog } from '@/data/changelog';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  // 获取当前版本号（changelog 数组第一项）
  const currentVersion = changelog[0]?.version || 'v1.0.0';

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

        {/* 用户协议和版本号 */}
        <p className="text-gray-400 text-xs space-x-3">
          <button
            onClick={() => setShowAgreement(true)}
            className="hover:text-banana-600 transition-colors cursor-pointer"
          >
            用户协议
          </button>
          <span>|</span>
          <button
            onClick={() => setShowChangelog(true)}
            className="hover:text-banana-600 transition-colors cursor-pointer"
          >
            {currentVersion}
          </button>
        </p>
      </div>

      {/* 更新日志弹窗 */}
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      {/* 用户协议弹窗 */}
      <UserAgreementModal isOpen={showAgreement} onClose={() => setShowAgreement(false)} />
    </footer>
  );
};
