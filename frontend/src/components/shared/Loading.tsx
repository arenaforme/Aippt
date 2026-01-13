import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';

interface LoadingProps {
  fullscreen?: boolean;
  message?: string;
  progress?: { total: number; completed: number };
  showTimer?: boolean;           // 是否显示已等待时间
  estimatedTime?: string;        // 预计时间文案，如 "4-5 分钟"
  showStageHints?: boolean;      // 是否显示分阶段提示
}

// 分阶段提示文案
const STAGE_HINTS = [
  'AI 正在理解您的内容...',
  '正在生成精美图片...',
  'AI 正在优化细节...',
  '即将完成，请稍候...',
];

// 格式化等待时间
const formatElapsedTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const Loading: React.FC<LoadingProps> = ({
  fullscreen = false,
  message = '加载中...',
  progress,
  showTimer = false,
  estimatedTime,
  showStageHints = false,
}) => {
  // 已等待时间计时器
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // 当前阶段提示索引
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!showTimer) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showTimer]);

  useEffect(() => {
    if (!showStageHints) return;
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGE_HINTS.length);
    }, 6000); // 每6秒切换
    return () => clearInterval(timer);
  }, [showStageHints]);

  const content = (
    <div className="flex flex-col items-center justify-center">
      {/* 加载图标 */}
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 border-4 border-banana-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-banana-500 rounded-full border-t-transparent animate-spin" />
      </div>
      
      {/* 消息 */}
      <p className="text-lg text-gray-700 mb-2">{message}</p>

      {/* 分阶段提示 */}
      {showStageHints && (
        <p className="text-sm text-gray-500 mb-4 transition-opacity duration-500">
          {STAGE_HINTS[stageIndex]}
        </p>
      )}

      {/* 等待时间和预计时间 */}
      {(showTimer || estimatedTime) && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          {showTimer && <span>已等待 {formatElapsedTime(elapsedSeconds)}</span>}
          {showTimer && estimatedTime && <span>·</span>}
          {estimatedTime && <span>预计 {estimatedTime}</span>}
        </div>
      )}

      {/* 进度条 */}
      {progress && (
        <div className="w-64">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>已完成 {progress.completed}/{progress.total} 页</span>
            <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-banana-500 to-banana-600 transition-all duration-300"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

// 骨架屏组件
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-gray-200 via-banana-50 to-gray-200',
        'bg-[length:200%_100%]',
        className
      )}
    />
  );
};

