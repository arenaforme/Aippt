/**
 * 套餐管理页面（管理员专用）
 * 管理会员套餐的增删改查
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Crown, Image, Zap, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Card, Input, Loading, Modal, useToast, useConfirm, UserMenu } from '@/components/shared';
import * as membershipApi from '@/api/membership';
import type { MembershipPlan } from '@/api/membership';

export const MembershipPlans: React.FC = () => {
  const navigate = useNavigate();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 表单状态
  const [form, setForm] = useState({
    name: '',
    level: 'basic' as 'free' | 'basic' | 'premium',
    period_type: 'monthly' as 'none' | 'monthly' | 'yearly',
    duration_days: 30,
    price: 0,
    image_quota: 0,
    premium_quota: 0,
    is_active: true,
    sort_order: 0,
  });

  // 加载套餐列表
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await membershipApi.adminGetAllPlans();
      setPlans(data);
    } catch (error: any) {
      show({ message: '加载套餐列表失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 打开创建弹窗
  const openCreateModal = () => {
    setEditingPlan(null);
    setForm({
      name: '',
      level: 'basic',
      period_type: 'monthly',
      duration_days: 30,
      price: 0,
      image_quota: 100,
      premium_quota: 10,
      is_active: true,
      sort_order: plans.length,
    });
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      level: plan.level,
      period_type: plan.period_type,
      duration_days: plan.duration_days,
      price: plan.price,
      image_quota: plan.image_quota,
      premium_quota: plan.premium_quota,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setIsModalOpen(true);
  };

  // 保存套餐
  const handleSave = async () => {
    if (!form.name.trim()) {
      show({ message: '请输入套餐名称', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      if (editingPlan) {
        await membershipApi.adminUpdatePlan(editingPlan.id, form);
        show({ message: '套餐更新成功', type: 'success' });
      } else {
        await membershipApi.adminCreatePlan(form);
        show({ message: '套餐创建成功', type: 'success' });
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (error: any) {
      show({ message: '保存失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // 删除套餐
  const handleDelete = (plan: MembershipPlan) => {
    if (plan.is_default) {
      show({ message: '默认套餐不能删除', type: 'error' });
      return;
    }
    confirm(
      `确定要删除套餐 "${plan.name}" 吗？此操作不可恢复。`,
      async () => {
        try {
          await membershipApi.adminDeletePlan(plan.id);
          show({ message: '套餐已删除', type: 'success' });
          loadPlans();
        } catch (error: any) {
          show({ message: '删除失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
        }
      },
      { title: '确认删除套餐', variant: 'danger', confirmText: '删除' }
    );
  };

  // 切换套餐状态
  const handleToggleActive = async (plan: MembershipPlan) => {
    try {
      await membershipApi.adminUpdatePlan(plan.id, { is_active: !plan.is_active });
      show({ message: plan.is_active ? '套餐已禁用' : '套餐已启用', type: 'success' });
      loadPlans();
    } catch (error: any) {
      show({ message: '操作失败: ' + (error.response?.data?.error?.message || error.message), type: 'error' });
    }
  };

  if (isLoading) {
    return <Loading fullscreen message="加载套餐列表..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      <ToastContainer />
      {ConfirmDialog}

      {/* 顶栏 - 毛玻璃效果 */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-border/50 sticky top-0 z-10 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={18} />} onClick={() => navigate('/admin/users')}>
              返回用户管理
            </Button>
            <div className="flex items-center gap-2">
              <Crown size={24} className="text-purple-600" />
              <h1 className="text-xl font-bold text-foreground">套餐管理</h1>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <Card className="p-6 bg-white/80 backdrop-blur-sm">
          {/* 工具栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground">共 {plans.length} 个套餐</div>
            <Button variant="primary" icon={<Plus size={18} />} onClick={openCreateModal}>
              创建套餐
            </Button>
          </div>

          {/* 套餐列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => openEditModal(plan)}
                onDelete={() => handleDelete(plan)}
                onToggleActive={() => handleToggleActive(plan)}
              />
            ))}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">暂无套餐数据</div>
          )}
        </Card>
      </main>

      {/* 创建/编辑弹窗 */}
      <PlanFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        isSaving={isSaving}
        isEditing={!!editingPlan}
      />
    </div>
  );
};

// ===== 子组件 =====

// 等级配置
const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  free: { label: '免费', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  basic: { label: '基础', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  premium: { label: '高级', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// 周期配置
const PERIOD_CONFIG: Record<string, string> = {
  none: '永久',
  monthly: '月付',
  yearly: '年付',
};

// 套餐卡片组件
const PlanCard: React.FC<{
  plan: MembershipPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}> = ({ plan, onEdit, onDelete, onToggleActive }) => {
  const levelConfig = LEVEL_CONFIG[plan.level] || LEVEL_CONFIG.free;

  return (
    <Card className={`p-4 relative ${!plan.is_active ? 'opacity-60' : ''}`}>
      {/* 状态标签 */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {plan.is_default && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">默认</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
          {plan.is_active ? '启用' : '禁用'}
        </span>
      </div>

      {/* 套餐信息 */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded ${levelConfig.color} ${levelConfig.bgColor}`}>
            {levelConfig.label}
          </span>
          <span className="text-xs text-muted-foreground">{PERIOD_CONFIG[plan.period_type]}</span>
        </div>
      </div>

      {/* 价格和时长 */}
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-2xl font-bold text-foreground">¥{plan.price}</span>
        <span className="text-sm text-muted-foreground">/ {plan.duration_days}天</span>
      </div>

      {/* 配额信息 */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Image size={14} className="text-blue-500" />
          <span>图片配额: {plan.image_quota}{plan.period_type !== 'none' ? '/月' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap size={14} className="text-purple-500" />
          <span>高级配额: {plan.premium_quota}{plan.period_type !== 'none' ? '/月' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={14} className="text-muted-foreground" />
          <span>排序: {plan.sort_order}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={onToggleActive}
          className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title={plan.is_active ? '禁用' : '启用'}
        >
          {plan.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-muted-foreground hover:text-banana-600 hover:bg-banana-50 rounded transition-colors"
          title="编辑"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          disabled={plan.is_default}
          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 transition-colors"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </Card>
  );
};

// 表单类型
interface PlanFormData {
  name: string;
  level: 'free' | 'basic' | 'premium';
  period_type: 'none' | 'monthly' | 'yearly';
  duration_days: number;
  price: number;
  image_quota: number;
  premium_quota: number;
  is_active: boolean;
  sort_order: number;
}

// 套餐表单弹窗组件
const PlanFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  form: PlanFormData;
  setForm: (v: PlanFormData) => void;
  onSave: () => void;
  isSaving: boolean;
  isEditing: boolean;
}> = ({ isOpen, onClose, form, setForm, onSave, isSaving, isEditing }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? '编辑套餐' : '创建套餐'}>
    <div className="space-y-4">
      <Input
        label="套餐名称"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="如：基础月卡"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">会员等级</label>
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value as PlanFormData['level'] })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="free">免费</option>
            <option value="basic">基础</option>
            <option value="premium">高级</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">付费周期</label>
          <select
            value={form.period_type}
            onChange={(e) => setForm({ ...form, period_type: e.target.value as PlanFormData['period_type'] })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="none">永久</option>
            <option value="monthly">月付</option>
            <option value="yearly">年付</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">价格（元）</label>
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">有效天数</label>
          <input
            type="number"
            min="1"
            value={form.duration_days}
            onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <span className="flex items-center gap-1"><Image size={14} className="text-blue-500" /> 图片配额{form.period_type !== 'none' ? '（/月）' : ''}</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.image_quota}
            onChange={(e) => setForm({ ...form, image_quota: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <span className="flex items-center gap-1"><Zap size={14} className="text-purple-500" /> 高级配额{form.period_type !== 'none' ? '（/月）' : ''}</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.premium_quota}
            onChange={(e) => setForm({ ...form, premium_quota: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">排序（数字越小越靠前）</label>
        <input
          type="number"
          min="0"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="rounded border-border"
        />
        <label htmlFor="is_active" className="text-sm text-foreground">启用此套餐</label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={onSave} loading={isSaving}>
          {isEditing ? '保存' : '创建'}
        </Button>
      </div>
    </div>
  </Modal>
);

export default MembershipPlans;
