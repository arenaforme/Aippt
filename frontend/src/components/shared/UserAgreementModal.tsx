/**
 * 用户协议弹窗组件
 * 支持从 API 获取自定义内容，无自定义内容时显示默认协议
 */
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Markdown } from './Markdown';
import { getAgreement } from '@/api/endpoints';

interface UserAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAgreementModal: React.FC<UserAgreementModalProps> = ({ isOpen, onClose }) => {
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
      const response = await getAgreement('user_agreement');
      if (response.data?.content) {
        setContent(response.data.content);
      } else {
        setContent('');
      }
    } catch (error) {
      console.error('加载用户协议失败:', error);
      setContent('');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">用户协议</h2>
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
            <DefaultAgreementContent />
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

/** 默认协议正文内容 */
const DefaultAgreementContent = () => (
  <div className="space-y-4">
    <p className="text-gray-500 text-xs">最后更新：2026年1月7日</p>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">一、服务说明</h3>
      <p>AI演示眼（以下简称"本服务"）是一款基于人工智能技术的演示文稿生成工具。本服务使用 AI 大模型生成内容，包括文本、布局建议和配图等。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">二、用户行为规范</h3>
      <p>用户在使用本服务时，应遵守以下规定：</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>不得利用本服务制作、传播违反国家法律法规的内容</li>
        <li>不得生成涉及色情、暴力、恐怖、赌博等违法违规内容</li>
        <li>不得侵犯他人知识产权、肖像权、隐私权等合法权益</li>
        <li>不得利用本服务从事任何危害国家安全、社会公共利益的活动</li>
        <li>不得利用本服务制作虚假信息或进行欺诈活动</li>
      </ul>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">三、免责声明</h3>
      <p className="mb-2"><strong>3.1 AI 生成内容</strong></p>
      <p>本服务生成的内容由人工智能算法自动产生，可能存在不准确、不完整或不适当的情况。用户应自行审核生成内容的准确性和适用性，并对使用生成内容承担全部责任。</p>

      <p className="mb-2 mt-3"><strong>3.2 可编辑 PPTX 导出功能</strong></p>
      <p>可编辑 PPTX 导出功能使用 OCR（光学字符识别）和 AI 大模型技术从图片中提取文字。由于技术限制：</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>复杂背景、艺术字体或特殊排版的文字可能无法完全识别</li>
        <li>部分文字可能存在识别错误</li>
        <li>图片背景中的装饰性文字可能被误提取为正文</li>
        <li>某些文字可能因技术原因未被提取</li>
        <li>原始字体、字号、颜色等格式可能无法完全复原，导出结果将使用系统默认字体</li>
        <li>复杂的排版布局、动画效果可能无法保留</li>
      </ul>
      <p className="mt-2">用户应在导出后仔细检查并修正内容，本服务不对导出结果的准确性、完整性和格式还原度承担责任。</p>

      <p className="mb-2 mt-3"><strong>3.3 PDF 转可编辑 PPTX 功能</strong></p>
      <p>PDF 转可编辑 PPTX 功能通过智能识别技术将 PDF 文档转换为可编辑的演示文稿格式。由于技术限制：</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>PDF 中的字体可能因版权或技术原因无法嵌入，将被替换为系统默认字体</li>
        <li>原始文档的字体样式、字号、行距等格式可能无法完全复原</li>
        <li>复杂的页面布局、表格、图表可能无法精确还原</li>
        <li>矢量图形可能被转换为位图，导致清晰度下降</li>
        <li>扫描版 PDF 的文字识别可能存在误差</li>
        <li>手写内容、特殊符号、公式等可能无法正确识别</li>
      </ul>
      <p className="mt-2">转换结果仅供参考，用户应自行检查并根据需要进行调整。本服务不对转换结果与原始文件的一致性承担任何责任。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">四、知识产权</h3>
      <p>用户输入的原创内容，其知识产权归用户所有。用户使用本服务生成的演示文稿，用户享有使用权，可用于个人或商业用途。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">五、协议修改</h3>
      <p>本服务保留随时修改本协议的权利。协议修改后，将在服务内公布。用户继续使用本服务即视为接受修改后的协议。</p>
    </section>

    <section>
      <h3 className="font-semibold text-gray-900 mb-2">六、其他</h3>
      <p>本协议的解释、效力及争议解决均适用中华人民共和国法律。如有争议，双方应友好协商解决；协商不成的，任何一方均可向本服务运营方所在地人民法院提起诉讼。</p>
    </section>
  </div>
);
