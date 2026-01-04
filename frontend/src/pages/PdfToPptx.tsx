/**
 * PDF 转 PPTX 工具页面
 * 将 PDF 演示文稿转换为可编辑的 PPTX 文件
 * 设计规范：AppShell 布局 + 毛玻璃卡片 + Spring 动画
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, Download, Loader2, CheckCircle, XCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card } from '@/components/shared';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import * as api from '@/api/endpoints';
import * as membershipApi from '@/api/membership';
import { appendTokenToUrl } from '@/utils';

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

    // 检查权限
    try {
      const result = await membershipApi.checkPermission('pdf_to_pptx');
      if (!result.has_permission) {
        setStatus('failed');
        setErrorMessage(result.error || '需要高级会员才能使用此功能，请前往会员中心开通');
        return;
      }
      // 检查配额
      if (result.quota && result.quota.remaining <= 0) {
        setStatus('failed');
        setErrorMessage('高级功能配额不足，请前往会员中心升级');
        return;
      }
    } catch (err) {
      // 权限检查失败，继续尝试（后端会再次检查）
    }

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
      window.open(appendTokenToUrl(downloadUrl), '_blank');
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

  // 顶栏右侧内容
  const topbarRightContent = (
    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/')}>
      <Home className="h-4 w-4" />
      <span className="hidden sm:inline">主页</span>
    </Button>
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
          title="PDF 转 PPTX"
          description="将 PDF 演示文稿转换为可编辑的 PowerPoint 文件"
        />

        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* 主转换卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className={cn(
              'p-8 bg-card/80 backdrop-blur-sm',
              'border border-border/50',
              'rounded-xl'
            )}>
              {/* 文件上传区域 */}
              {status === 'idle' && (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                    selectedFile
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  )}
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
                      <FileText className="w-16 h-16 mx-auto text-primary" />
                      <div>
                        <p className="text-lg font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvert();
                        }}
                      >
                        开始转换
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-16 h-16 mx-auto text-muted-foreground/50" />
                      <div>
                        <p className="text-lg font-medium text-foreground">拖拽 PDF 文件到此处</p>
                        <p className="text-sm text-muted-foreground">或点击选择文件</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 上传/处理中状态 */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="text-center py-12 space-y-6">
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {status === 'uploading' ? '正在上传...' : '正在转换...'}
                    </p>
                    {progress.stage_name && (
                      <p className="text-sm text-muted-foreground mt-1">{progress.stage_name}</p>
                    )}
                  </div>

                  {/* 进度条 */}
                  {progress.total && progress.total > 0 && (
                    <div className="max-w-md mx-auto">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>进度</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
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
                    <p className="text-lg font-medium text-foreground">转换完成！</p>
                    {progress.pages_count && (
                      <p className="text-sm text-muted-foreground mt-1">
                        共 {progress.pages_count} 页，{progress.text_blocks_count || 0} 个文本块
                        {progress.images_count ? `，${progress.images_count} 张图片` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button onClick={handleDownload} className="gap-2">
                      <Download className="w-4 h-4" />
                      下载 PPTX
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      转换其他文件
                    </Button>
                  </div>
                </div>
              )}

              {/* 失败状态 */}
              {status === 'failed' && (
                <div className="text-center py-12 space-y-6">
                  <XCircle className="w-16 h-16 mx-auto text-destructive" />
                  <div>
                    <p className="text-lg font-medium text-foreground">转换失败</p>
                    <p className="text-sm text-destructive mt-1">{errorMessage}</p>
                  </div>
                  <Button variant="outline" onClick={handleReset}>
                    重试
                  </Button>
                </div>
              )}

              {/* 错误提示 */}
              {errorMessage && status === 'idle' && (
                <p className="text-center text-destructive mt-4">{errorMessage}</p>
              )}
            </Card>
          </motion.div>

          {/* 说明信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className={cn(
              'p-6 bg-primary/5 border-primary/10',
              'rounded-xl'
            )}>
              <h3 className="font-medium text-foreground mb-3">使用说明</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 支持由 NotebookLM、Google Slides 等工具生成的 PDF 演示文稿</li>
                <li>• 转换后的 PPTX 文件中的文本可直接编辑</li>
                <li>• PDF 中的图片会被保留并嵌入到 PPTX 中</li>
                <li>• 建议使用矢量文本的 PDF（非扫描件）以获得最佳效果</li>
              </ul>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
