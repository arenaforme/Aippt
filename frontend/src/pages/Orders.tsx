/**
 * 订单记录页面
 * 显示用户的订单历史
 * 设计规范：毛玻璃卡片 + 渐变背景
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button, Card, Loading, useToast, UserMenu } from '@/components/shared';
import * as membershipApi from '@/api/membership';
import type { Order } from '@/api/membership';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background
                    relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 - 毛玻璃效果 */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home size={18} />
              <span className="ml-1">首页</span>
            </Button>
            <h1 className="text-lg font-semibold text-foreground">订单记录</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回会员中心 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate('/membership')}
          >
            <ChevronLeft size={16} />
            <span>返回会员中心</span>
          </Button>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className="p-12 text-center bg-white/80 dark:bg-white/5 backdrop-blur-xl
                            border border-white/20 dark:border-white/10
                            shadow-[0_8px_32px_rgb(0_0_0/0.08)] rounded-2xl">
              <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">暂无订单记录</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => navigate('/membership')}
              >
                去购买会员
              </Button>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* 订单列表 */}
            <div className="space-y-4">
              {orders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Card className="p-4 bg-white/80 dark:bg-white/5 backdrop-blur-xl
                                    border border-white/20 dark:border-white/10
                                    shadow-[0_4px_16px_rgb(0_0_0/0.04)] rounded-xl
                                    hover:shadow-[0_8px_32px_rgb(0_0_0/0.08)] transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">订单号：{order.order_no}</p>
                          <p className="text-sm text-muted-foreground mt-1">
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
                          <p className="font-medium text-foreground">{order.plan_name || '会员套餐'}</p>
                          {order.payment_method && (
                            <p className="text-sm text-muted-foreground mt-1">
                              支付方式：{PAYMENT_METHOD_CONFIG[order.payment_method] || order.payment_method}
                            </p>
                          )}
                          {order.payment_time && (
                            <p className="text-sm text-muted-foreground">
                              支付时间：{formatDate(order.payment_time)}
                            </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="text-xl font-bold text-foreground">¥{order.amount}</p>
                        {canDelete(order) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDelete(order)}
                            disabled={deletingId === order.id}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4 mt-8"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
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
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                  <ChevronRight size={16} />
                </Button>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Orders;
