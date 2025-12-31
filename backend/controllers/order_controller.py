"""
订单控制器 - 处理订单相关API请求
"""
import logging
from flask import Blueprint, g, request
from utils.auth import login_required, admin_required
from utils.response import success_response, error_response
from services.order_service import OrderService
from services.membership_service import MembershipService
from services.cbb_pay_service import query_cbb_order
from models import Order, MembershipPlan

logger = logging.getLogger(__name__)

order_bp = Blueprint('order', __name__, url_prefix='/api/orders')


@order_bp.route('', methods=['POST'])
@login_required
def create_order():
    """创建订单"""
    data = request.get_json() or {}
    plan_id = data.get('plan_id')

    if not plan_id:
        return error_response('请选择会员套餐', 400)

    # 检查套餐是否存在
    plan = MembershipPlan.query.get(plan_id)
    if not plan or not plan.is_active:
        return error_response('套餐不存在或已下架', 400)

    # 检查用户是否可以购买该套餐
    can_purchase, purchase_error = MembershipService.can_purchase_plan(
        g.current_user, plan
    )
    if not can_purchase:
        return error_response(purchase_error, 400)

    # 创建订单（支付方式由用户在 CBB 页面选择）
    order, error = OrderService.create_order(
        user=g.current_user,
        plan=plan,
        payment_method=None  # 用户在 CBB 页面选择
    )

    if error:
        return error_response(error, 400)

    # 创建支付（获取 CBB 支付页面链接）
    pay_url, pay_error = OrderService.create_payment(order)
    if pay_error:
        # 支付创建失败，但订单已创建，返回订单信息让用户可以重试
        return success_response({
            **order.to_dict(),
            'payment_error': pay_error
        }, '订单创建成功，但获取支付链接失败')

    return success_response(order.to_dict(), '订单创建成功')


@order_bp.route('/<order_id>', methods=['GET'])
@login_required
def get_order(order_id: str):
    """获取订单详情"""
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在', 404)

    # 验证订单归属
    if order.user_id != g.current_user.id and g.current_user.role != 'admin':
        return error_response('无权查看此订单', 403)

    return success_response(order.to_dict())


@order_bp.route('/<order_id>/status', methods=['GET'])
@login_required
def get_order_status(order_id: str):
    """查询订单支付状态（用于前端轮询）

    如果订单状态为 pending 且有 CBB 交易号，会主动查询 CBB 支付状态并同步
    """
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在', 404)

    # 验证订单归属
    if order.user_id != g.current_user.id:
        return error_response('无权查看此订单', 403)

    # 检查订单是否过期
    OrderService.check_order_expired(order)

    # 如果订单待支付且有 CBB 交易号，主动查询 CBB 状态
    if order.status == 'pending' and order.transaction_id:
        cbb_data, error = query_cbb_order(order.transaction_id)
        if cbb_data:
            # CBB 返回的支付状态字段是 payStatus，值为 PAYED 表示已支付
            cbb_status = cbb_data.get('payStatus')
            logger.info(f"CBB 订单状态查询: {order.order_no} -> {cbb_status}")

            # CBB 状态为 PAYED 时完成支付
            if cbb_status == 'PAYED':
                success, err = OrderService.complete_payment(
                    order,
                    order.transaction_id
                )
                if success:
                    logger.info(f"订单支付完成（主动查询）: {order.order_no}")
                else:
                    logger.error(f"完成支付失败: {err}")

    return success_response({
        'order_id': order.id,
        'order_no': order.order_no,
        'status': order.status,
        'payment_time': order.payment_time.isoformat() if order.payment_time else None,
    })


@order_bp.route('/<order_id>/cancel', methods=['POST'])
@login_required
def cancel_order(order_id: str):
    """取消订单"""
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在', 404)

    # 验证订单归属
    if order.user_id != g.current_user.id:
        return error_response('无权操作此订单', 403)

    success, error = OrderService.cancel_order(order)
    if not success:
        return error_response(error, 400)

    return success_response(order.to_dict(), '订单已取消')


@order_bp.route('/<order_id>', methods=['DELETE'])
@login_required
def delete_order(order_id: str):
    """删除订单（仅限已取消或已过期的订单）"""
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在', 404)

    # 验证订单归属
    if order.user_id != g.current_user.id:
        return error_response('无权操作此订单', 403)

    success, error = OrderService.delete_order(order)
    if not success:
        return error_response(error, 400)

    return success_response(None, '订单已删除')


@order_bp.route('/my', methods=['GET'])
@login_required
def get_my_orders():
    """获取当前用户的订单列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')  # 可选状态筛选

    query = Order.query.filter_by(user_id=g.current_user.id)
    if status:
        query = query.filter_by(status=status)

    query = query.order_by(Order.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return success_response({
        'orders': [order.to_dict() for order in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    })


# ==================== 管理员 API ====================

@order_bp.route('/admin/list', methods=['GET'])
@admin_required
def admin_list_orders():
    """管理员获取所有订单列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    payment_method = request.args.get('payment_method')
    order_no = request.args.get('order_no')
    user_id = request.args.get('user_id')

    query = Order.query

    if status:
        query = query.filter_by(status=status)
    if payment_method:
        query = query.filter_by(payment_method=payment_method)
    if order_no:
        query = query.filter(Order.order_no.like(f'%{order_no}%'))
    if user_id:
        query = query.filter_by(user_id=user_id)

    query = query.order_by(Order.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    # 获取用户信息
    from models import User
    orders_data = []
    for order in pagination.items:
        order_dict = order.to_dict()
        user = User.query.get(order.user_id)
        order_dict['username'] = user.username if user else '未知用户'
        orders_data.append(order_dict)

    return success_response({
        'orders': orders_data,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    })


@order_bp.route('/admin/<order_id>', methods=['GET'])
@admin_required
def admin_get_order(order_id: str):
    """管理员获取订单详情"""
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在', 404)

    from models import User
    order_dict = order.to_dict()
    user = User.query.get(order.user_id)
    order_dict['username'] = user.username if user else '未知用户'

    return success_response(order_dict)


@order_bp.route('/admin/<order_id>', methods=['DELETE'])
@admin_required
def admin_delete_order(order_id: str):
    """管理员删除订单（仅限已取消或已过期的订单）"""
    order = Order.query.get(order_id)
    if not order:
        return error_response('订单不存在', 404)

    success, error = OrderService.delete_order(order)
    if not success:
        return error_response(error, 400)

    logger.info(f"管理员删除订单: {order_id}, 操作者: {g.current_user.username}")
    return success_response(None, '订单已删除')
