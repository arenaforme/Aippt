/**
 * 会员协议弹窗组件
 * 支持从 API 获取自定义内容，无自定义内容时显示默认协议
 * 包含用户协议内容 + 会员服务条款 + 支付风险免责
 */
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Markdown } from './Markdown';
import { getAgreement } from '@/api/endpoints';

interface MembershipAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MembershipAgreementModal: React.FC<MembershipAgreementModalProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAgreement();
    }
  }, [isOpen]);

  const loadAgreement = async () => {
    setIsLoading(true);
    try {
      const response = await getAgreement('membership_agreement');
      if (response.data?.content) {
        setContent(response.data.content);
      } else {
        setContent('');
      }
    } catch (error) {
      console.error('加载会员协议失败:', error);
      setContent('');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">会员协议</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 协议内容 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] text-sm text-gray-600 leading-relaxed">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-banana-500" />
            </div>
          ) : content ? (
            <Markdown content={content} />
          ) : (
            <DefaultMembershipAgreementContent />
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-banana-500 text-white rounded-lg hover:bg-banana-600 transition-colors"
          >
            我已阅读并理解
          </button>
        </div>
      </div>
    </div>
  );
};

/** 默认会员协议正文内容 */
const DefaultMembershipAgreementContent = () => (
  <div className="space-y-4">
    <p className="text-gray-500 text-xs">最后更新：2026年1月7日</p>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">一、服务说明</h3>
      <p>AI演示眼（以下简称"本服务"）是一款基于人工智能技术的演示文稿生成工具。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">二、用户行为规范</h3>
      <p>用户在使用本服务时，应遵守以下规定：</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>不得利用本服务制作、传播违反国家法律法规的内容</li>
        <li>不得生成涉及色情、暴力、恐怖、赌博等违法违规内容</li>
        <li>不得侵犯他人知识产权、肖像权、隐私权等合法权益</li>
      </ul>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">三、免责声明</h3>
      <p>本服务生成的内容由人工智能算法自动产生，可能存在不准确、不完整或不适当的情况。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">四、会员服务条款</h3>
      <p>会员可享受更多的 PPT 生成配额、可编辑 PPTX 导出、PDF 转可编辑 PPTX 等高级功能。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">五、高级功能免责声明</h3>

      <p className="mb-2"><strong>5.1 可编辑 PPTX 导出功能</strong></p>
      <p>本功能使用 OCR（光学字符识别）和 AI 大模型技术从图片中提取文字并生成可编辑文档。由于技术限制：</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>复杂背景、艺术字体或特殊排版的文字可能无法完全识别</li>
        <li>部分文字可能存在识别错误或遗漏</li>
        <li>原始字体、字号、颜色等格式可能无法完全复原，导出结果将使用系统默认字体</li>
        <li>复杂的排版布局、动画效果可能无法保留</li>
        <li>不同版本的演示软件（PowerPoint、WPS 等）显示效果可能存在差异</li>
      </ul>

      <p className="mb-2 mt-3"><strong>5.2 PDF 转可编辑 PPTX 功能</strong></p>
      <p>本功能通过智能识别技术将 PDF 文档转换为可编辑的演示文稿格式。由于技术限制：</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>PDF 中的字体可能因版权或技术原因无法嵌入，将被替换为系统默认字体</li>
        <li>原始文档的字体样式、字号、行距等格式可能无法完全复原</li>
        <li>复杂的页面布局、表格、图表可能无法精确还原</li>
        <li>矢量图形可能被转换为位图，导致清晰度下降</li>
        <li>扫描版 PDF 的文字识别可能存在误差</li>
        <li>手写内容、特殊符号、公式等可能无法正确识别</li>
      </ul>

      <p className="mt-3"><strong>5.3 免责说明</strong></p>
      <p>上述功能的转换结果仅供参考，用户应在使用前仔细检查并根据需要进行调整。本服务不对转换结果的准确性、完整性、格式还原度以及与原始文件的一致性承担任何责任。用户因使用转换结果而产生的任何损失，本服务不承担赔偿责任。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">六、支付条款</h3>
      <p>本服务支持微信支付、支付宝等第三方支付方式。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">七、支付风险免责</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>因网络问题导致的支付延迟或失败，本服务不承担责任</li>
        <li>因第三方支付平台的技术问题导致的支付异常，由相应支付平台负责处理</li>
      </ul>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">八、其他</h3>
      <p>本协议的解释、效力及争议解决均适用中华人民共和国法律。</p>
    </section>
  </div>
);
