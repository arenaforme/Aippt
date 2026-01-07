/**
 * 协议管理页面（管理员专用）
 * 支持编辑用户协议和会员协议
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Eye } from 'lucide-react';
import { Button, Card, Loading, useToast, UserMenu } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { getAdminAgreement, updateAgreement } from '@/api/endpoints';
import type { AgreementType } from '@/api/endpoints';

type TabType = 'user_agreement' | 'membership_agreement';

export const AgreementManagement: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('user_agreement');
  const [userAgreement, setUserAgreement] = useState('');
  const [membershipAgreement, setMembershipAgreement] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 加载协议内容
  const loadAgreements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userRes, memberRes] = await Promise.all([
        getAdminAgreement('user_agreement'),
        getAdminAgreement('membership_agreement'),
      ]);
      setUserAgreement(userRes.data?.content || '');
      setMembershipAgreement(memberRes.data?.content || '');
    } catch (error: any) {
      console.error('加载协议失败:', error);
      setTimeout(() => {
        show({ message: '加载协议失败: ' + (error.message || '未知错误'), type: 'error' });
      }, 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  // 保存协议
  const handleSave = async (type: AgreementType) => {
    setIsSaving(true);
    try {
      const content = type === 'user_agreement' ? userAgreement : membershipAgreement;
      await updateAgreement(type, content);
      show({
        message: type === 'user_agreement' ? '用户协议保存成功' : '会员协议保存成功',
        type: 'success'
      });
    } catch (error: any) {
      console.error('保存协议失败:', error);
      show({ message: '保存失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const currentContent = activeTab === 'user_agreement' ? userAgreement : membershipAgreement;
  const setCurrentContent = activeTab === 'user_agreement' ? setUserAgreement : setMembershipAgreement;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50 flex items-center justify-center">
        <Loading text="加载协议中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      <ToastContainer />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="p-6">
          {/* 顶部标题 */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-200">
            <div className="flex items-center">
              <Button
                variant="secondary"
                icon={<ArrowLeft size={18} />}
                onClick={() => navigate('/admin/users')}
                className="mr-4"
              >
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="mr-2" size={24} />
                  协议管理
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  编辑用户协议和会员协议内容（支持 Markdown 格式）
                </p>
              </div>
            </div>
            <UserMenu />
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-gray-200 mt-6">
            <button
              onClick={() => setActiveTab('user_agreement')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'user_agreement'
                  ? 'border-banana-500 text-banana-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              用户协议
            </button>
            <button
              onClick={() => setActiveTab('membership_agreement')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'membership_agreement'
                  ? 'border-banana-500 text-banana-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              会员协议
            </button>
          </div>

          {/* 编辑区域 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {activeTab === 'user_agreement'
                  ? '用于注册页面和落地页的用户协议'
                  : '用于支付页面的会员协议（包含支付相关条款）'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                icon={<Eye size={16} />}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? '编辑模式' : '预览模式'}
              </Button>
            </div>

            {showPreview ? (
              <div className="border rounded-lg p-6 bg-white min-h-[400px] max-h-[600px] overflow-y-auto">
                {currentContent ? (
                  <Markdown content={currentContent} />
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    暂无自定义内容，将显示默认协议
                  </p>
                )}
              </div>
            ) : (
              <textarea
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                placeholder="输入协议内容（支持 Markdown 格式）...&#10;&#10;留空将显示默认协议内容"
                className="w-full h-[500px] p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-banana-500 focus:border-transparent"
              />
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentContent('');
                show({ message: '已清空，保存后将使用默认协议', type: 'info' });
              }}
            >
              恢复默认
            </Button>
            <Button
              variant="primary"
              icon={<Save size={18} />}
              onClick={() => handleSave(activeTab)}
              loading={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgreementManagement;
