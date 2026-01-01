/**
 * FAQ 常见问题
 * 手风琴折叠样式
 */
import { useState } from 'react';

const faqs = [
  {
    question: '生成的 PPT 质量如何？',
    answer:
      'AI 会根据你的内容智能生成专业布局和配图。生成效果取决于输入内容的质量和具体程度，建议提供清晰的主题描述以获得更好的结果。你可以在预览阶段对内容进行调整和修改。',
  },
  {
    question: '支持哪些导出格式？',
    answer:
      '支持导出为 PPTX 和 PDF 格式。基础会员可导出图片版 PPTX 和 PDF；高级会员可导出可编辑的 PPTX（支持在 PowerPoint、WPS 等软件中继续编辑），并可使用 PDF 转可编辑 PPTX 工具。',
  },
  {
    question: '免费版有什么限制？',
    answer:
      '免费版提供有限的图片生成配额，可以体验 PPT 生成的基本流程。如需更多配额或高级功能（如可编辑 PPTX 导出），可以升级到付费套餐。',
  },
  {
    question: '如何升级会员？',
    answer:
      '登录后进入会员中心，选择适合的套餐进行购买即可。支持微信和支付宝支付。',
  },
  {
    question: '生成的内容可以商用吗？',
    answer:
      '是的，你生成的演示文稿内容归你所有，可以用于商业用途。',
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-gray-900 mb-4">
            常见问题
          </h2>
          <p className="text-xl text-gray-500">
            有疑问？这里可能有你想要的答案
          </p>
        </div>

        {/* FAQ 列表 */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => toggleFaq(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface FAQItemProps {
  faq: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem = ({ faq, isOpen, onToggle }: FAQItemProps) => (
  <div className="bg-white rounded-xl overflow-hidden shadow-sm">
    <button
      onClick={onToggle}
      className="w-full px-6 py-5 flex items-center justify-between text-left"
    >
      <span className="font-medium text-gray-900">{faq.question}</span>
      <svg
        className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="px-6 pb-5 text-gray-500 leading-relaxed">
        {faq.answer}
      </div>
    )}
  </div>
);
