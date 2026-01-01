/**
 * 核心功能展示
 * 三列卡片布局，展示三种创建方式
 */

const features = [
  {
    icon: '💡',
    title: '一句话生成',
    description: '输入想法，nano banana AI 自动生成完整 PPT 大纲和内容',
  },
  {
    icon: '📋',
    title: '从大纲生成',
    description: '粘贴现有大纲，智能解析并生成精美幻灯片',
  },
  {
    icon: '📝',
    title: '从描述生成',
    description: '详细描述每页内容，获得精准定制的演示文稿',
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-gray-900 mb-4">
            多种创建方式
          </h2>
          <p className="text-xl text-gray-500">
            选择最适合你的方式，快速生成专业演示文稿
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl
                         transition-shadow duration-300"
            >
              <div className="text-5xl mb-6">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
