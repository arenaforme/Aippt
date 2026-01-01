/**
 * 使用流程展示
 * 横向四步骤流程图
 */

const steps = [
  { number: '1', title: '输入想法', description: '描述你的演示主题' },
  { number: '2', title: 'AI 生成内容', description: '自动生成大纲和配图' },
  { number: '3', title: '预览调整', description: '实时预览并微调' },
  { number: '4', title: '导出使用', description: '下载 PPTX 或 PDF' },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold text-gray-900 mb-4">
            简单四步，完成演示
          </h2>
          <p className="text-xl text-gray-500">
            从想法到成品，只需几分钟
          </p>
        </div>

        {/* 步骤流程 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* 连接线 - 仅在非最后一项显示 */}
              {index < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5
                             bg-gradient-to-r from-banana-500 to-banana-100"
                />
              )}

              <div className="relative text-center">
                {/* 步骤数字 */}
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-banana-500
                             flex items-center justify-center text-2xl font-bold
                             text-gray-900 shadow-yellow"
                >
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
