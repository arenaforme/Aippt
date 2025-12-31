/**
 * 会员相关 API
 */
import { apiClient } from './client';

// 类型定义
export interface MembershipPlan {
  id: string;
  name: string;
  level: 'free' | 'basic' | 'premium';
  period_type: 'none' | 'monthly' | 'yearly';
  duration_days: number;
  price: number;
  image_quota: number;
  premium_quota: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

// 购买信息
export interface PurchaseInfo {
  can_purchase: boolean;
  operation_type: 'new' | 'renew' | 'upgrade' | 'plan_change' | null;
  error: string | null;
  message: string;
}

// 带购买信息的套餐
export interface MembershipPlanWithPurchaseInfo extends MembershipPlan {
  purchase_info: PurchaseInfo;
}

export interface MembershipStatus {
  user_id: string;
  level: string;
  effective_level: string;
  membership_display: string;
  is_active: boolean;
  expires_at: string | null;
  image_quota: number;
  premium_quota: number;
  quota_reset_at: string | null;
}

export interface QuotaInfo {
  image_quota: number;
  premium_quota: number;
  quota_reset_at: string | null;
}

export interface FeaturePermission {
  id: string;
  feature_code: string;
  feature_name: string;
  min_level: string;
  consume_quota: boolean;
  quota_type: string | null;
  is_active: boolean;
}

export interface PermissionCheckResult {
  has_permission: boolean;
  error: string | null;
  quota: {
    type: string;
    remaining: number;
  } | null;
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ==================== 用户端 API ====================

/**
 * 获取可购买的会员套餐列表
 */
export const getPlans = async (): Promise<MembershipPlan[]> => {
  const response = await apiClient.get<ApiResponse<MembershipPlan[]>>(
    '/api/membership/plans'
  );
  return response.data.data;
};

/**
 * 获取带购买信息的套餐列表（需要登录）
 */
export const getPlansWithPurchaseInfo = async (): Promise<MembershipPlanWithPurchaseInfo[]> => {
  const response = await apiClient.get<ApiResponse<MembershipPlanWithPurchaseInfo[]>>(
    '/api/membership/plans/purchase-info'
  );
  return response.data.data;
};

/**
 * 获取当前用户会员状态
 */
export const getMembershipStatus = async (): Promise<MembershipStatus> => {
  const response = await apiClient.get<ApiResponse<MembershipStatus>>(
    '/api/membership/status'
  );
  return response.data.data;
};

/**
 * 获取当前用户配额详情
 */
export const getQuota = async (): Promise<QuotaInfo> => {
  const response = await apiClient.get<ApiResponse<QuotaInfo>>(
    '/api/membership/quota'
  );
  return response.data.data;
};

/**
 * 获取功能权限配置列表
 */
export const getPermissions = async (): Promise<FeaturePermission[]> => {
  const response = await apiClient.get<ApiResponse<FeaturePermission[]>>(
    '/api/membership/permissions'
  );
  return response.data.data;
};

/**
 * 检查当前用户是否有权限使用某功能
 */
export const checkPermission = async (
  featureCode: string
): Promise<PermissionCheckResult> => {
  const response = await apiClient.get<ApiResponse<PermissionCheckResult>>(
    `/api/membership/check/${featureCode}`
  );
  return response.data.data;
};

// ==================== 管理端 API ====================

/**
 * 获取所有套餐列表（含免费套餐）
 */
export const adminGetAllPlans = async (): Promise<MembershipPlan[]> => {
  const response = await apiClient.get<ApiResponse<MembershipPlan[]>>(
    '/api/admin/membership/plans'
  );
  return response.data.data;
};

/**
 * 创建新套餐
 */
export const adminCreatePlan = async (
  plan: Partial<MembershipPlan>
): Promise<MembershipPlan> => {
  const response = await apiClient.post<ApiResponse<MembershipPlan>>(
    '/api/admin/membership/plans',
    plan
  );
  return response.data.data;
};

/**
 * 更新套餐
 */
export const adminUpdatePlan = async (
  planId: string,
  plan: Partial<MembershipPlan>
): Promise<MembershipPlan> => {
  const response = await apiClient.put<ApiResponse<MembershipPlan>>(
    `/api/admin/membership/plans/${planId}`,
    plan
  );
  return response.data.data;
};

/**
 * 删除套餐
 */
export const adminDeletePlan = async (planId: string): Promise<void> => {
  await apiClient.delete(`/api/admin/membership/plans/${planId}`);
};

/**
 * 手动设置用户会员
 */
export const adminSetUserMembership = async (
  userId: string,
  data: { plan_id: string; expires_at?: string }
): Promise<void> => {
  await apiClient.put(`/api/admin/membership/users/${userId}/membership`, data);
};

/**
 * 取消用户会员
 */
export const adminCancelUserMembership = async (
  userId: string
): Promise<void> => {
  await apiClient.delete(`/api/admin/membership/users/${userId}/membership`);
};

/**
 * 手动调整用户配额
 */
export const adminSetUserQuota = async (
  userId: string,
  quota: { image_quota?: number; premium_quota?: number }
): Promise<void> => {
  await apiClient.put(`/api/admin/membership/users/${userId}/quota`, quota);
};

// ==================== 订单 API ====================

export interface Order {
  id: string;
  order_no: string;
  user_id: string;
  plan_id: string;
  plan_name: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
  payment_method: 'wechat' | 'alipay' | null;
  payment_time: string | null;
  transaction_id: string | null;
  qr_code_url: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  payment_error?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

/**
 * 创建订单
 * 用户在 CBB 支付页面选择支付方式（微信/支付宝）
 */
export const createOrder = async (planId: string): Promise<Order> => {
  const response = await apiClient.post<ApiResponse<Order>>('/api/orders', {
    plan_id: planId,
  });
  return response.data.data;
};

/**
 * 获取订单详情
 */
export const getOrder = async (orderId: string): Promise<Order> => {
  const response = await apiClient.get<ApiResponse<Order>>(
    `/api/orders/${orderId}`
  );
  return response.data.data;
};

/**
 * 查询订单支付状态
 */
export const getOrderStatus = async (
  orderId: string
): Promise<{ order_id: string; order_no: string; status: string; payment_time: string | null }> => {
  const response = await apiClient.get<ApiResponse<any>>(
    `/api/orders/${orderId}/status`
  );
  return response.data.data;
};

/**
 * 取消订单
 */
export const cancelOrder = async (orderId: string): Promise<Order> => {
  const response = await apiClient.post<ApiResponse<Order>>(
    `/api/orders/${orderId}/cancel`
  );
  return response.data.data;
};

/**
 * 删除订单（仅限已取消或已过期的订单）
 */
export const deleteOrder = async (orderId: string): Promise<void> => {
  await apiClient.delete(`/api/orders/${orderId}`);
};

/**
 * 获取我的订单列表
 */
export const getMyOrders = async (
  page: number = 1,
  perPage: number = 10,
  status?: string
): Promise<OrderListResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('per_page', perPage.toString());
  if (status) params.append('status', status);

  const response = await apiClient.get<ApiResponse<OrderListResponse>>(
    `/api/orders/my?${params.toString()}`
  );
  return response.data.data;
};

// ==================== 管理员订单 API ====================

export interface AdminOrder extends Order {
  username: string;
}

export interface AdminOrderListResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

/**
 * 管理员获取所有订单列表
 */
export const adminGetOrders = async (params: {
  page?: number;
  perPage?: number;
  status?: string;
  paymentMethod?: string;
  orderNo?: string;
  userId?: string;
}): Promise<AdminOrderListResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.perPage) searchParams.append('per_page', params.perPage.toString());
  if (params.status) searchParams.append('status', params.status);
  if (params.paymentMethod) searchParams.append('payment_method', params.paymentMethod);
  if (params.orderNo) searchParams.append('order_no', params.orderNo);
  if (params.userId) searchParams.append('user_id', params.userId);

  const response = await apiClient.get<ApiResponse<AdminOrderListResponse>>(
    `/api/orders/admin/list?${searchParams.toString()}`
  );
  return response.data.data;
};

/**
 * 管理员获取订单详情
 */
export const adminGetOrder = async (orderId: string): Promise<AdminOrder> => {
  const response = await apiClient.get<ApiResponse<AdminOrder>>(
    `/api/orders/admin/${orderId}`
  );
  return response.data.data;
};

/**
 * 管理员删除订单（仅限已取消或已过期的订单）
 */
export const adminDeleteOrder = async (orderId: string): Promise<void> => {
  await apiClient.delete(`/api/orders/admin/${orderId}`);
};

