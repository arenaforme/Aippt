/**
 * 订单记录页面
 * 显示用户的订单历史
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button, Card, Loading, useToast, UserMenu } from '@/components/shared';
import * as membershipApi from '@/api/membership';
import { formatDate } from '@/utils/projectUtils';
import type { Order } from '@/api/membership';

// 订单状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待支付', color: 'text-yellow-600 bg-yellow-50', icon: <Clock size={14} /> },
  paid: { label: '已支付', color: 'text-green-600 bg-green-50', icon: <CheckCircle size={14} /> },
  cancelled: { label: '已取消', color: 'text-gray-600 bg-gray-50', icon: <XCircle size={14} /> },
  expired: { label: '已过期', color: 'text-gray-600 bg-gray-50', icon: <AlertCircle size={14} /> },
  refunded: { label: '已退款', color: 'text-blue-600 bg-blue-50', icon: <AlertCircle size={14} /> },
};

// 支付方式配置
const PAYMENT_METHOD_CONFIG: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 加载订单
  useEffect(() => {
    loadOrders();
  }, [page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await membershipApi.getMyOrders(page, 10);
      setOrders(data.orders);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (error: any) {
      show({ message: error.message || '加载订单失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 删除订单
  const handleDelete = async (order: Order) => {
    if (!confirm(`确定要删除订单 ${order.order_no} 吗？此操作不可恢复。`)) {
      return;
    }

    setDeletingId(order.id);
    try {
      await membershipApi.deleteOrder(order.id);
      show({ message: '订单已删除', type: 'success' });
      loadOrders();
    } catch (error: any) {
      show({ message: error.message || '删除订单失败', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  // 判断订单是否可删除
  const canDelete = (order: Order) => {
    return order.status === 'cancelled' || order.status === 'expired';
  };

  // 获取状态配置
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-banana-50 to-yellow-50">
      {/* 顶栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={18} />} onClick={() => navigate('/admin/users')}>
              返回用户管理
            </Button>
            <div className="flex items-center gap-2">
              <FileText size={24} className="text-banana-600" />
              <h1 className="text-xl font-bold text-gray-900">订单记录</h1>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">暂无订单记录</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => navigate('/membership')}
            >
              去购买会员
            </Button>
          </Card>
        ) : (
          <>
            {/* 订单列表 */}
            <div className="space-y-4">
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">订单号：{order.order_no}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          创建时间：{formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{order.plan_name || '会员套餐'}</p>
                        {order.payment_method && (
                          <p className="text-sm text-gray-500 mt-1">
                            支付方式：{PAYMENT_METHOD_CONFIG[order.payment_method] || order.payment_method}
                          </p>
                        )}
                        {order.payment_time && (
                          <p className="text-sm text-gray-500">
                            支付时间：{formatDate(order.payment_time)}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="text-xl font-bold text-gray-900">¥{order.amount}</p>
                        {canDelete(order) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(order)}
                            disabled={deletingId === order.id}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                  上一页
                </Button>
                <span className="text-sm text-gray-600">
                  第 {page} / {totalPages} 页，共 {total} 条
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Orders;
