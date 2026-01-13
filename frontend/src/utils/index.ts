import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Project, Page } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 合并 className (支持 Tailwind CSS)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 标准化后端返回的项目数据
 */
export function normalizeProject(data: any): Project {
  return {
    ...data,
    id: data.project_id || data.id,
    template_image_path: data.template_image_url || data.template_image_path,
    pages: (data.pages || []).map(normalizePage),
  };
}

/**
 * 标准化后端返回的页面数据
 */
export function normalizePage(data: any): Page {
  return {
    ...data,
    id: data.page_id || data.id,
    generated_image_path: data.generated_image_url || data.generated_image_path,
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 从 Axios 错误对象中提取后端返回的错误消息
 * 后端返回格式: { success: false, error: { code: string, message: string } }
 */
export function extractErrorMessage(error: any): string {
  // 优先从后端响应中提取错误消息
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  // 兼容旧格式: { message: string }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  // 使用 Axios 错误消息
  if (error?.message) {
    return error.message;
  }
  return '操作失败';
}

/**
 * 将错误消息转换为友好的中文提示
 */
export function normalizeErrorMessage(errorMessage: string | null | undefined): string {
  if (!errorMessage) return '操作失败';

  const message = errorMessage.toLowerCase();

  if (message.includes('no template image found')) {
    return '当前项目还没有模板，请先点击页面工具栏的"更换模板"按钮，选择或上传一张模板图片后再生成。';
  } else if (message.includes('page must have description content')) {
    return '该页面还没有描述内容，请先在"编辑页面描述"步骤为此页生成或填写描述。';
  } else if (message.includes('image already exists')) {
    return '该页面已经有图片，如需重新生成，请在生成时选择"重新生成"或稍后重试。';
  }

  return errorMessage;
}

/**
 * 为下载 URL 附加认证 token
 * 用于 window.open 等无法携带 Authorization header 的场景
 */
export function appendTokenToUrl(url: string): string {
  const token = useAuthStore.getState().token;
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * 图片分辨率检测结果
 */
export interface ImageResolutionResult {
  width: number;
  height: number;
  status: 'low' | 'optimal' | 'high';
  message: string | null;
}

// 分辨率阈值常量
const MIN_RECOMMENDED_SIZE = 1280;  // 最低推荐分辨率
const MAX_RECOMMENDED_SIZE = 3840;  // 最高推荐分辨率（4K）

/**
 * 检测图片文件的分辨率并返回建议
 * @param file 图片文件
 * @returns Promise<ImageResolutionResult>
 */
export function checkImageResolution(file: File): Promise<ImageResolutionResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: width, naturalHeight: height } = img;
      const maxDimension = Math.max(width, height);

      let status: 'low' | 'optimal' | 'high';
      let message: string | null = null;

      if (maxDimension < MIN_RECOMMENDED_SIZE) {
        status = 'low';
        message = `图片分辨率较低（${width}×${height}），建议使用 1280px 以上的图片以获得更好的 AI 生成效果`;
      } else if (maxDimension > MAX_RECOMMENDED_SIZE) {
        status = 'high';
        message = `图片分辨率较高（${width}×${height}），AI 模型会自动压缩处理，可考虑使用 4K 以下的图片以加快上传速度`;
      } else {
        status = 'optimal';
      }

      resolve({ width, height, status, message });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0, status: 'optimal', message: null });
    };

    img.src = url;
  });
}

