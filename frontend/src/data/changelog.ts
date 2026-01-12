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
    version: 'v2.10.2',
    date: '2026-01-12',
    changes: [
      { type: 'fix', description: '修复模板预览图显示不全的问题' },
      { type: 'perf', description: '优化我的模板删除按钮位置，避免误操作' },
    ],
  },
  {
    version: 'v2.10.1',
    date: '2026-01-12',
    changes: [
      { type: 'feat', description: '批量生成页面时自动创建历史版本记录' },
      { type: 'fix', description: '修复用户管理搜索框无法输入中文和多字符的问题' },
      { type: 'perf', description: '用户管理页面新增搜索按钮' },
    ],
  },
  {
    version: 'v2.10.0',
    date: '2026-01-12',
    changes: [
      { type: 'feat', description: '新增预设模板管理和用户模板管理功能' },
      { type: 'feat', description: '支持管理员复制用户模板为预设模板' },
      { type: 'perf', description: '优化模板选择交互体验' },
      { type: 'perf', description: '统一管理后台页面导航样式' },
    ],
  },
  {
    version: 'v2.9.0',
    date: '2026-01-12',
    changes: [
      { type: 'feat', description: '新增忘记密码功能，支持短信验证码重置密码' },
      { type: 'feat', description: '管理后台分页功能：项目管理、用户管理、审计日志、通知管理' },
      { type: 'feat', description: '新增通用分页组件，支持页码导航和每页条数选择' },
    ],
  },
  {
    version: 'v2.8.1',
    date: '2026-01-11',
    changes: [
      { type: 'feat', description: '通知弹窗显示发布时间' },
      { type: 'feat', description: '新增管理员二次认证开关配置（用户管理页面）' },
    ],
  },
  {
    version: 'v2.8.0',
    date: '2026-01-11',
    changes: [
      { type: 'feat', description: '安全加固：管理员登录二次认证（短信验证码）' },
      { type: 'feat', description: '安全加固：API 权限控制优化' },
    ],
  },
  {
    version: 'v2.7.9',
    date: '2026-01-11',
    changes: [
      { type: 'feat', description: '新增通知公告系统，支持落地页弹窗展示' },
      { type: 'feat', description: '管理员通知管理功能（创建、编辑、删除、排序）' },
      { type: 'feat', description: '用户通知列表页面，支持 Markdown 内容渲染' },
      { type: 'feat', description: '用户菜单未读通知红点提示' },
      { type: 'feat', description: '全局弹窗开关，管理员可控制是否显示落地页弹窗' },
    ],
  },
  {
    version: 'v2.7.8',
    date: '2026-01-10',
    changes: [
      { type: 'fix', description: '附件上传权限隔离，用户只能看到本次上传的文件' },
    ],
  },
  {
    version: 'v2.7.7',
    date: '2026-01-10',
    changes: [
      { type: 'feat', description: '导出文件名智能生成，根据 PPT 内容自动命名' },
      { type: 'perf', description: '文件名预生成缓存，优化导出体验' },
    ],
  },
  {
    version: 'v2.7.6',
    date: '2026-01-10',
    changes: [
      { type: 'feat', description: '新增 Grsai 图片生成 Provider，支持第三方 API 2K 分辨率' },
      { type: 'feat', description: 'Docling 替换 MinerU 作为文档解析引擎' },
      { type: 'feat', description: '手机号绑定功能' },
      { type: 'perf', description: '权限控制优化' },
      { type: 'fix', description: 'SQLite 迁移使用 batch 模式添加字段' },
    ],
  },
  {
    version: 'v2.7.5',
    date: '2026-01-08',
    changes: [
      { type: 'docs', description: '用户协议和会员协议新增可编辑 PPTX、PDF 转换功能免责条款' },
    ],
  },
  {
    version: 'v2.7.4',
    date: '2026-01-08',
    changes: [
      { type: 'feat', description: 'TaskManager 支持动态配置，管理员可在设置页面调整后台任务并发数' },
      { type: 'feat', description: '用户名最小长度改为 2，支持两字姓名注册' },
    ],
  },
  {
    version: 'v2.7.3',
    date: '2026-01-07',
    changes: [
      { type: 'feat', description: '新增用户协议和会员协议管理功能' },
      { type: 'fix', description: '修改下载功能权限为所有用户可用' },
    ],
  },
  {
    version: 'v2.7.2',
    date: '2026-01-07',
    changes: [
      { type: 'docs', description: '更新产品截图' },
    ],
  },
  {
    version: 'v2.7.1',
    date: '2026-01-05',
    changes: [
      { type: 'refactor', description: '重构 GenAI Provider 支持双模式（SDK/HTTP）' },
    ],
  },
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
