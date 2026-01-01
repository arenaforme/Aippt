/**
 * 产品优势展示
 * 四列图标 + 文字布局
 */

const advantages = [
  {
    icon: '🍌',
    title: 'nano banana AI',
    description: '原生 AI 技术，理解你的表达意图',
  },
  {
    icon: '⚡',
    title: '快速高效',
    description: '几分钟完成传统数小时的工作',
  },
  {
    icon: '🎨',
    title: 'AI 智能配图',
    description: '自动生成与内容匹配的精美插图',
  },
  {
    icon: '📝',
    title: '可编辑导出',
    description: '导出 PPTX/PDF，自由调整',
  },
];

export const Advantages = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-gray-900 mb-4">
            为什么选择我们
          </h2>
          <p className="text-xl text-gray-500">
            强大的 AI 能力，让演示文稿制作变得简单
          </p>
        </div>

        {/* 优势列表 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {advantages.map((item, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
