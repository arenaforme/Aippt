import React from 'react';
import { Modal } from './Modal';
import { FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ExportProgress {
  total: number;
  completed: number;
  current_page?: number;
  stage?: string;
  stage_name?: string;
  text_blocks_count?: number;
}

interface ExportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress | null;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  error?: string | null;
  downloadUrl?: string | null;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  status,
  error,
  downloadUrl,
}) => {
  const percentage = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const canClose = status === 'completed' || status === 'failed';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="导出可编辑 PPT"
      size="md"
      hideCloseButton={!canClose}
    >
      <div className="space-y-6">
        {/* 状态图标 */}
        <div className="flex justify-center">
          {status === 'processing' && (
            <Loader2 className="w-16 h-16 text-banana-500 animate-spin" />
          )}
          {status === 'completed' && (
            <CheckCircle className="w-16 h-16 text-green-500" />
          )}
          {status === 'failed' && (
            <AlertCircle className="w-16 h-16 text-red-500" />
          )}
        </div>

        {/* 进度信息 */}
        {status === 'processing' && progress && (
          <div className="space-y-4">
            {/* 当前阶段 */}
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                {progress.stage_name || '处理中...'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                第 {progress.current_page || progress.completed} / {progress.total} 页
              </p>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-banana-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* 进度百分比 */}
            <p className="text-center text-sm text-gray-500">{percentage}%</p>
          </div>
        )}

        {/* 完成状态 */}
        {status === 'completed' && (
          <div className="text-center space-y-4">
            <p className="text-lg font-medium text-green-600">导出完成！</p>
            {progress?.text_blocks_count !== undefined && (
              <p className="text-sm text-gray-500">
                共识别 {progress.text_blocks_count} 个文字块
              </p>
            )}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-banana-500
                         text-white rounded-lg hover:bg-banana-600 transition-colors"
              >
                <FileText size={18} />
                重新下载
              </a>
            )}
          </div>
        )}

        {/* 失败状态 */}
        {status === 'failed' && (
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-red-600">导出失败</p>
            {error && <p className="text-sm text-gray-500">{error}</p>}
          </div>
        )}

        {/* 关闭按钮 */}
        {canClose && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg
                       hover:bg-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
