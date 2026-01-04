/**
 * 管理后台订单管理页面
 * 显示所有用户的订单记录，支持筛选和搜索
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { Button, Card, Input, Loading, useToast, UserMenu } from '@/components/shared';
import * as membershipApi from '@/api/membership';
import type { AdminOrder } from '@/api/membership';

// 订单状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待支付', color: 'text-yellow-600 bg-yellow-500/10', icon: <Clock size={14} /> },
  paid: { label: '已支付', color: 'text-green-600 bg-green-500/10', icon: <CheckCircle size={14} /> },
  cancelled: { label: '已取消', color: 'text-muted-foreground bg-muted', icon: <XCircle size={14} /> },
  expired: { label: '已过期', color: 'text-muted-foreground bg-muted', icon: <AlertCircle size={14} /> },
  refunded: { label: '已退款', color: 'text-blue-600 bg-blue-500/10', icon: <AlertCircle size={14} /> },
};

// 支付方式配置
const PAYMENT_METHOD_CONFIG: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

export const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 筛选条件
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [searchOrderNo, setSearchOrderNo] = useState('');

  // 加载订单
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await membershipApi.adminGetOrders({
        page,
        perPage: 20,
        status: statusFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
        orderNo: searchOrderNo || undefined,
      });
      setOrders(data.orders);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (error: any) {
      // 使用 setTimeout 避免在渲染周期中调用 show 导致无限循环
      setTimeout(() => {
        show({ message: error.message || '加载订单失败', type: 'error' });
      }, 0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentMethodFilter, searchOrderNo]); // 移除 show 依赖

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取状态配置
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  // 搜索处理
  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  // 重置筛选
  const handleReset = () => {
    setStatusFilter('');
    setPaymentMethodFilter('');
    setSearchOrderNo('');
    setPage(1);
  };

  // 删除订单
  const handleDelete = async (order: AdminOrder) => {
    if (!confirm(`确定要删除订单 ${order.order_no} 吗？此操作不可恢复。`)) {
      return;
    }

    setDeletingId(order.id);
    try {
      await membershipApi.adminDeleteOrder(order.id);
      show({ message: '订单已删除', type: 'success' });
      loadOrders();
    } catch (error: any) {
      show({ message: error.message || '删除订单失败', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  // 判断订单是否可删除
  const canDelete = (order: AdminOrder) => {
    return order.status === 'cancelled' || order.status === 'expired';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      {/* 顶部导航 - 毛玻璃效果 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
              <ArrowLeft size={18} />
              <span className="ml-1">返回</span>
            </Button>
            <h1 className="text-lg font-semibold text-foreground">订单管理</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 筛选区域 */}
        <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm border-white/20">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-muted-foreground" />
              <Input
                placeholder="搜索订单号"
                value={searchOrderNo}
                onChange={(e) => setSearchOrderNo(e.target.value)}
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="">全部状态</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="cancelled">已取消</option>
              <option value="expired">已过期</option>
              <option value="refunded">已退款</option>
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="">全部支付方式</option>
              <option value="wechat">微信支付</option>
              <option value="alipay">支付宝</option>
            </select>

            <Button variant="primary" size="sm" onClick={handleSearch}>
              搜索
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              重置
            </Button>

            <span className="ml-auto text-sm text-muted-foreground">共 {total} 条记录</span>
          </div>
        </Card>

        {/* 订单列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center bg-white/80 backdrop-blur-sm">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无订单记录</p>
          </Card>
        ) : (
          <OrderTable
            orders={orders}
            formatDate={formatDate}
            getStatusConfig={getStatusConfig}
            canDelete={canDelete}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        )}
      </main>
    </div>
  );
};

export default AdminOrders;

// 订单表格组件
interface OrderTableProps {
  orders: AdminOrder[];
  formatDate: (dateStr: string | null) => string;
  getStatusConfig: (status: string) => { label: string; color: string; icon: React.ReactNode };
  canDelete: (order: AdminOrder) => boolean;
  onDelete: (order: AdminOrder) => void;
  deletingId: string | null;
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  formatDate,
  getStatusConfig,
  canDelete,
  onDelete,
  deletingId,
}) => {
  return (
    <Card className="overflow-hidden bg-white/80 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                订单号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                用户
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                套餐
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                金额
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                支付方式
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                创建时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                支付时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground font-mono">
                    {order.order_no}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      {order.username}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {order.plan_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    ¥{order.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {order.payment_method ? (
                      <div className="flex items-center gap-1">
                        <CreditCard size={14} />
                        {PAYMENT_METHOD_CONFIG[order.payment_method] || order.payment_method}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.color}`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(order.payment_time)}
                  </td>
                  <td className="px-4 py-3">
                    {canDelete(order) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => onDelete(order)}
                        disabled={deletingId === order.id}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// 分页组件
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, onPageChange }) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} />
        上一页
      </Button>
      <span className="text-sm text-muted-foreground">
        第 {page} / {totalPages} 页，共 {total} 条
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
        <ChevronRight size={16} />
      </Button>
    </div>
  );
};
