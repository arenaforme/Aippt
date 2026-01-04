/**
 * 系统设置页面
 * 设计规范：AppShell 布局 + 毛玻璃卡片 + Spring 动画
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Key, Image, Zap, Save, RotateCcw, Globe, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Input, Card, Loading, useToast, useConfirm } from '@/components/shared';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import * as api from '@/api/endpoints';
import type { OutputLanguage } from '@/api/endpoints';
import { OUTPUT_LANGUAGE_OPTIONS } from '@/api/endpoints';
import type { Settings as SettingsType } from '@/types';

// 配置项类型定义
type FieldType = 'text' | 'password' | 'number' | 'select' | 'buttons';

interface FieldConfig {
  key: keyof typeof initialFormData;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  sensitiveField?: boolean;  // 是否为敏感字段（如 API Key）
  lengthKey?: keyof SettingsType;  // 用于显示已有长度的 key（如 api_key_length）
  options?: { value: string; label: string }[];  // select 类型的选项
  min?: number;
  max?: number;
}

interface SectionConfig {
  title: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
}

// 初始表单数据
const initialFormData = {
  ai_provider_format: 'gemini' as 'openai' | 'gemini',
  api_base_url: '',
  api_key: '',
  text_model: '',
  image_model: '',
  image_caption_model: '',
  mineru_api_base: '',
  mineru_token: '',
  image_resolution: '2K',
  image_aspect_ratio: '16:9',
  max_description_workers: 5,
  max_image_workers: 8,
  output_language: 'zh' as OutputLanguage,
};

// 配置驱动的表单区块定义
const settingsSections: SectionConfig[] = [
  {
    title: '大模型 API 配置',
    icon: <Key size={20} />,
    fields: [
      {
        key: 'ai_provider_format',
        label: 'AI 提供商格式',
        type: 'buttons',
        description: '选择 API 请求格式，影响后端如何构造和发送请求。保存设置后生效。',
        options: [
          { value: 'openai', label: 'OpenAI 格式' },
          { value: 'gemini', label: 'Gemini 格式' },
        ],
      },
      {
        key: 'api_base_url',
        label: 'API Base URL',
        type: 'text',
        placeholder: 'https://api.example.com',
        description: '设置大模型提供商 API 的基础 URL',
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: '输入新的 API Key',
        sensitiveField: true,
        lengthKey: 'api_key_length',
        description: '留空则保持当前设置不变，输入新值则更新',
      },
    ],
  },
  {
    title: '模型配置',
    icon: <FileText size={20} />,
    fields: [
      {
        key: 'text_model',
        label: '文本大模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: gemini-2.0-flash-exp)',
        description: '用于生成大纲、描述等文本内容的模型名称',
      },
      {
        key: 'image_model',
        label: '图像生成模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: imagen-3.0-generate-001)',
        description: '用于生成页面图片的模型名称',
      },
      {
        key: 'image_caption_model',
        label: '图片识别模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: gemini-2.0-flash-exp)',
        description: '用于识别参考文件中的图片并生成描述',
      },
    ],
  },
  {
    title: 'MinerU 配置',
    icon: <FileText size={20} />,
    fields: [
      {
        key: 'mineru_api_base',
        label: 'MinerU API Base',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: https://mineru.net)',
        description: 'MinerU 服务地址，用于解析参考文件',
      },
      {
        key: 'mineru_token',
        label: 'MinerU Token',
        type: 'password',
        placeholder: '输入新的 MinerU Token',
        sensitiveField: true,
        lengthKey: 'mineru_token_length',
        description: '留空则保持当前设置不变，输入新值则更新',
      },
    ],
  },
  {
    title: '图像生成配置',
    icon: <Image size={20} />,
    fields: [
      {
        key: 'image_resolution',
        label: '图像清晰度（某些OpenAI格式中转调整该值无效）',
        type: 'select',
        description: '更高的清晰度会生成更详细的图像，但需要更长时间',
        options: [
          { value: '1K', label: '1K (1024px)' },
          { value: '2K', label: '2K (2048px)' },
          { value: '4K', label: '4K (4096px)' },
        ],
      },
    ],
  },
  {
    title: '性能配置',
    icon: <Zap size={20} />,
    fields: [
      {
        key: 'max_description_workers',
        label: '描述生成最大并发数',
        type: 'number',
        min: 1,
        max: 20,
        description: '同时生成描述的最大工作线程数 (1-20)，越大速度越快',
      },
      {
        key: 'max_image_workers',
        label: '图像生成最大并发数',
        type: 'number',
        min: 1,
        max: 20,
        description: '同时生成图像的最大工作线程数 (1-20)，越大速度越快',
      },
    ],
  },
  {
    title: '输出语言设置',
    icon: <Globe size={20} />,
    fields: [
      {
        key: 'output_language',
        label: '默认输出语言',
        type: 'buttons',
        description: 'AI 生成内容时使用的默认语言',
        options: OUTPUT_LANGUAGE_OPTIONS,
      },
    ],
  },
];

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.getSettings();
      if (response.data) {
        setSettings(response.data);
        setFormData({
          ai_provider_format: response.data.ai_provider_format || 'gemini',
          api_base_url: response.data.api_base_url || '',
          api_key: '',
          image_resolution: response.data.image_resolution || '2K',
          image_aspect_ratio: response.data.image_aspect_ratio || '16:9',
          max_description_workers: response.data.max_description_workers || 5,
          max_image_workers: response.data.max_image_workers || 8,
          text_model: response.data.text_model || '',
          image_model: response.data.image_model || '',
          mineru_api_base: response.data.mineru_api_base || '',
          mineru_token: '',
          image_caption_model: response.data.image_caption_model || '',
          output_language: response.data.output_language || 'zh',
        });
      }
    } catch (error: any) {
      console.error('加载设置失败:', error);
      show({
        message: '加载设置失败: ' + (error?.message || '未知错误'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { api_key, mineru_token, ...otherData } = formData;
      const payload: Parameters<typeof api.updateSettings>[0] = {
        ...otherData,
      };

      if (api_key) {
        payload.api_key = api_key;
      }

      if (mineru_token) {
        payload.mineru_token = mineru_token;
      }

      const response = await api.updateSettings(payload);
      if (response.data) {
        setSettings(response.data);
        show({ message: '设置保存成功', type: 'success' });
        setFormData(prev => ({ ...prev, api_key: '', mineru_token: '' }));
      }
    } catch (error: any) {
      console.error('保存设置失败:', error);
      show({
        message: '保存设置失败: ' + (error?.response?.data?.error?.message || error?.message || '未知错误'),
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    confirm(
      '将把大模型、图像生成和并发等所有配置恢复为环境默认值，已保存的自定义设置将丢失，确定继续吗？',
      async () => {
        setIsSaving(true);
        try {
          const response = await api.resetSettings();
          if (response.data) {
            setSettings(response.data);
            setFormData({
              ai_provider_format: response.data.ai_provider_format || 'gemini',
              api_base_url: response.data.api_base_url || '',
              api_key: '',
              image_resolution: response.data.image_resolution || '2K',
              image_aspect_ratio: response.data.image_aspect_ratio || '16:9',
              max_description_workers: response.data.max_description_workers || 5,
              max_image_workers: response.data.max_image_workers || 8,
              text_model: response.data.text_model || '',
              image_model: response.data.image_model || '',
              mineru_api_base: response.data.mineru_api_base || '',
              mineru_token: '',
              image_caption_model: response.data.image_caption_model || '',
              output_language: response.data.output_language || 'zh',
            });
            show({ message: '设置已重置', type: 'success' });
          }
        } catch (error: any) {
          console.error('重置设置失败:', error);
          show({
            message: '重置设置失败: ' + (error?.message || '未知错误'),
            type: 'error'
          });
        } finally {
          setIsSaving(false);
        }
      },
      {
        title: '确认重置为默认配置',
        confirmText: '确定重置',
        cancelText: '取消',
        variant: 'warning',
      }
    );
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key];

    if (field.type === 'buttons' && field.options) {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {field.label}
          </label>
          <div className="flex flex-wrap gap-2">
            {field.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFieldChange(field.key, option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  value === option.value
                    ? option.value === 'openai'
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {field.description && (
            <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
    }

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {field.label}
          </label>
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full h-10 px-4 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.description && (
            <p className="mt-1 text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
    }

    // text, password, number 类型
    const placeholder = field.sensitiveField && settings && field.lengthKey
      ? `已设置（长度: ${settings[field.lengthKey]}）`
      : field.placeholder || '';

    return (
      <div key={field.key}>
        <Input
          label={field.label}
          type={field.type === 'number' ? 'number' : field.type}
          placeholder={placeholder}
          value={value as string | number}
          onChange={(e) => {
            const newValue = field.type === 'number' 
              ? parseInt(e.target.value) || (field.min ?? 0)
              : e.target.value;
            handleFieldChange(field.key, newValue);
          }}
          min={field.min}
          max={field.max}
        />
        {field.description && (
          <p className="mt-1 text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppShell showSidebar={true}>
        <div className="flex items-center justify-center py-12">
          <Loading text="加载设置中..." />
        </div>
      </AppShell>
    );
  }

  const topbarRightContent = (
    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/')}>
      <Home className="h-4 w-4" />
      <span className="hidden sm:inline">主页</span>
    </Button>
  );

  const pageActions = (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleReset}
        disabled={isSaving}
      >
        <RotateCcw className="h-4 w-4" />
        重置默认
      </Button>
      <Button
        size="sm"
        className="gap-2"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Save className="h-4 w-4" />
          </motion.div>
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSaving ? '保存中...' : '保存设置'}
      </Button>
    </div>
  );

  return (
    <AppShell showSidebar={true} topbarRightContent={topbarRightContent}>
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <PageHeader
          title="系统设置"
          description="配置应用的各项参数"
          actions={pageActions}
        />

        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {settingsSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Card className={cn(
                'p-6 bg-card/80 backdrop-blur-sm',
                'border border-border/50',
                'rounded-xl'
              )}>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <span className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center mr-3',
                    'bg-primary/10 text-primary'
                  )}>
                    {section.icon}
                  </span>
                  {section.title}
                </h2>
                <div className="space-y-4 pl-12">
                  {section.fields.map((field) => renderField(field))}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <ToastContainer />
      {ConfirmDialog}
    </AppShell>
  );
};
