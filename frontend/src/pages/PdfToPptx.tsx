/**
 * PDF 转 PPTX 工具页面
 * 将 PDF 演示文稿转换为可编辑的 PPTX 文件
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Download, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';
import * as api from '@/api/endpoints';

type ConvertStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface ConvertProgress {
  current_page?: number;
  total?: number;
  completed?: number;
  stage?: string;
  stage_name?: string;
  text_blocks_count?: number;
  pages_count?: number;
  images_count?: number;
}

export default function PdfToPptx() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConvertStatus>('idle');
  const [progress, setProgress] = useState<ConvertProgress>({});
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');

  // 文件选择处理
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('请选择 PDF 文件');
        return;
      }
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setDownloadUrl('');
    }
  }, []);

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('请选择 PDF 文件');
        return;
      }
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setDownloadUrl('');
    }
  }, []);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId || status !== 'processing') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.getPdfConvertStatus(taskId);
        const data = response.data;

        if (data?.progress) {
          setProgress(data.progress);
        }

        if (data?.status === 'COMPLETED') {
          setStatus('completed');
          setDownloadUrl(data.download_url || '');
          clearInterval(pollInterval);
        } else if (data?.status === 'FAILED') {
          setStatus('failed');
          setErrorMessage(data.error || '转换失败');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('轮询状态失败:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [taskId, status]);

  // 开始转换
  const handleConvert = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setErrorMessage('');
    setProgress({});

    try {
      const response = await api.convertPdfToPptx(selectedFile);
      if (response.success && response.data?.task_id) {
        setTaskId(response.data.task_id);
        setStatus('processing');
      } else {
        throw new Error('创建任务失败');
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err.response?.data?.error?.message || err.message || '上传失败');
    }
  };

  // 下载文件
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  // 重置
  const handleReset = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress({});
    setDownloadUrl('');
    setErrorMessage('');
    setTaskId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 计算进度百分比
  const progressPercent = progress.total
    ? Math.round(((progress.completed || 0) / progress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">PDF 转 PPTX</h1>
            <p className="text-sm text-gray-500">将 PDF 演示文稿转换为可编辑的 PowerPoint 文件</p>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* 文件上传区域 */}
          {status === 'idle' && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                selectedFile ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-4">
                  <FileText className="w-16 h-16 mx-auto text-blue-500" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvert();
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    开始转换
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-700">拖拽 PDF 文件到此处</p>
                    <p className="text-sm text-gray-500">或点击选择文件</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 上传/处理中状态 */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="text-center py-12 space-y-6">
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {status === 'uploading' ? '正在上传...' : '正在转换...'}
                </p>
                {progress.stage_name && (
                  <p className="text-sm text-gray-500 mt-1">{progress.stage_name}</p>
                )}
              </div>

              {/* 进度条 */}
              {progress.total && progress.total > 0 && (
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>进度</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    第 {progress.current_page || 0} / {progress.total} 页
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 完成状态 */}
          {status === 'completed' && (
            <div className="text-center py-12 space-y-6">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <div>
                <p className="text-lg font-medium text-gray-900">转换完成！</p>
                {progress.pages_count && (
                  <p className="text-sm text-gray-500 mt-1">
                    共 {progress.pages_count} 页，{progress.text_blocks_count || 0} 个文本块
                    {progress.images_count ? `，${progress.images_count} 张图片` : ''}
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  下载 PPTX
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  转换其他文件
                </button>
              </div>
            </div>
          )}

          {/* 失败状态 */}
          {status === 'failed' && (
            <div className="text-center py-12 space-y-6">
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
              <div>
                <p className="text-lg font-medium text-gray-900">转换失败</p>
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              </div>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                重试
              </button>
            </div>
          )}

          {/* 错误提示 */}
          {errorMessage && status === 'idle' && (
            <p className="text-center text-red-500 mt-4">{errorMessage}</p>
          )}
        </div>

        {/* 说明信息 */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-medium text-blue-900 mb-3">使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• 支持由 NotebookLM、Google Slides 等工具生成的 PDF 演示文稿</li>
            <li>• 转换后的 PPTX 文件中的文本可直接编辑</li>
            <li>• PDF 中的图片会被保留并嵌入到 PPTX 中</li>
            <li>• 建议使用矢量文本的 PDF（非扫描件）以获得最佳效果</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
