/**
 * 版本更新日志数据
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'feat' | 'fix' | 'perf' | 'docs' | 'refactor';
    description: string;
  }[];
}

// 变更类型标签映射
export const changeTypeLabels: Record<ChangelogEntry['changes'][0]['type'], string> = {
  feat: '新功能',
  fix: '修复',
  perf: '优化',
  docs: '文档',
  refactor: '重构',
};

export const changelog: ChangelogEntry[] = [
  {
    version: 'v2.7.0',
    date: '2026-01-03',
    changes: [
      { type: 'feat', description: '新增版本更新日志查看功能' },
    ],
  },
  {
    version: 'v2.6.1',
    date: '2026-01-02',
    changes: [
      { type: 'fix', description: '修复导出下载认证失败问题' },
      { type: 'perf', description: '优化 Nginx 缓存策略，确保前端更新及时生效' },
    ],
  },
  {
    version: 'v2.6.0',
    date: '2026-01-01',
    changes: [
      { type: 'feat', description: '新增营销首页 (Landing Page)' },
      { type: 'feat', description: '品牌名称更新为「AI演示眼」' },
      { type: 'perf', description: '定价布局优化' },
      { type: 'fix', description: 'FAQ 内容修正' },
    ],
  },
  {
    version: 'v2.5.2',
    date: '2026-01-01',
    changes: [
      { type: 'fix', description: '添加 ProxyFix 中间件支持反向代理' },
    ],
  },
  {
    version: 'v2.5.1',
    date: '2025-12-31',
    changes: [
      { type: 'fix', description: '修复新用户配额初始化问题' },
      { type: 'fix', description: '修复错误提示显示问题' },
    ],
  },
  {
    version: 'v2.5.0',
    date: '2025-12-30',
    changes: [
      { type: 'feat', description: '添加完整会员系统' },
      { type: 'feat', description: '集成 CBB Pay 支付' },
    ],
  },
  {
    version: 'v2.4.0',
    date: '2025-12-28',
    changes: [
      { type: 'feat', description: '可编辑 PPTX 导出功能' },
      { type: 'feat', description: 'PDF 转可编辑 PPTX 工具' },
    ],
  },
];
