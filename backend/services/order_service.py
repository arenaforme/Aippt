"""
订单服务 - 处理订单业务逻辑
"""
from datetime import datetime, timedelta
from typing import Tuple, Optional
from models import db, Order, User, MembershipPlan
from services.membership_service import MembershipService
from services.cbb_pay_service import create_cbb_order, query_cbb_order
import logging

logger = logging.getLogger(__name__)


class OrderService:
    """订单服务类"""

    # 订单过期时间（分钟）
    ORDER_EXPIRE_MINUTES = 30

    @classmethod
    def create_order(
        cls,
        user: User,
        plan: MembershipPlan,
        payment_method: str
    ) -> Tuple[Optional[Order], Optional[str]]:
        """
        创建订单
        返回: (order, error_message)
        """
        try:
            # 检查是否有未支付的订单
            pending_order = Order.query.filter_by(
                user_id=user.id,
                status='pending'
            ).first()

            if pending_order:
                # 检查是否过期
                if cls.check_order_expired(pending_order):
                    pass  # 已过期，可以创建新订单
                else:
                    return None, '您有未完成的订单，请先完成支付或取消'

            # 创建订单
            order = Order(
                order_no=Order.generate_order_no(),
                user_id=user.id,
                plan_id=plan.id,
                amount=plan.price,
                status='pending',
                payment_method=payment_method,
                expires_at=datetime.utcnow() + timedelta(minutes=cls.ORDER_EXPIRE_MINUTES)
            )

            db.session.add(order)
            db.session.commit()

            logger.info(f"订单创建成功: {order.order_no}, 用户: {user.username}")
            return order, None

        except Exception as e:
            db.session.rollback()
            logger.error(f"创建订单失败: {str(e)}")
            return None, f'创建订单失败: {str(e)}'

    @classmethod
    def check_order_expired(cls, order: Order) -> bool:
        """
        检查订单是否过期，如果过期则更新状态
        返回: True 表示已过期
        """
        if order.status != 'pending':
            return False

        if order.expires_at and datetime.utcnow() > order.expires_at:
            order.status = 'expired'
            db.session.commit()
            logger.info(f"订单已过期: {order.order_no}")
            return True

        return False

    @classmethod
    def cancel_order(cls, order: Order) -> Tuple[bool, Optional[str]]:
        """
        取消订单
        返回: (success, error_message)
        """
        if order.status != 'pending':
            return False, '只能取消待支付的订单'

        try:
            order.status = 'cancelled'
            db.session.commit()
            logger.info(f"订单已取消: {order.order_no}")
            return True, None
        except Exception as e:
            db.session.rollback()
            logger.error(f"取消订单失败: {str(e)}")
            return False, f'取消订单失败: {str(e)}'

    @classmethod
    def complete_payment(
        cls,
        order: Order,
        transaction_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        完成支付（由支付回调调用）
        返回: (success, error_message)
        """
        if order.status == 'paid':
            return True, None  # 幂等处理

        if order.status != 'pending':
            return False, f'订单状态异常: {order.status}'

        try:
            # 更新订单状态
            order.status = 'paid'
            order.payment_time = datetime.utcnow()
            order.transaction_id = transaction_id

            # 开通会员
            user = order.user
            plan = order.plan
            success, error = MembershipService.activate_membership(user, plan)

            if not success:
                db.session.rollback()
                logger.error(f"开通会员失败: {error}")
                return False, error

            db.session.commit()
            logger.info(f"支付完成: {order.order_no}, 交易号: {transaction_id}")
            return True, None

        except Exception as e:
            db.session.rollback()
            logger.error(f"完成支付失败: {str(e)}")
            return False, f'完成支付失败: {str(e)}'

    @classmethod
    def get_order_by_no(cls, order_no: str) -> Optional[Order]:
        """根据订单号获取订单"""
        return Order.query.filter_by(order_no=order_no).first()

    @classmethod
    def create_payment(cls, order: Order) -> Tuple[Optional[str], Optional[str]]:
        """
        为订单创建支付（获取 CBB 支付页面链接）
        使用 CBB 聚合支付服务的页面服务
        返回: (pay_url, error_message)
        """
        plan = order.plan
        description = f'Banana Slides - {plan.name}'

        # 使用 CBB 聚合支付（统一使用页面服务）
        pay_url, cbb_trade_no, error = create_cbb_order(
            order_no=order.order_no,
            amount=float(order.amount),
            description=description
        )

        if pay_url:
            # 保存支付URL和CBB订单号到订单
            order.qr_code_url = pay_url
            if cbb_trade_no:
                order.transaction_id = cbb_trade_no  # 暂存CBB订单号
            db.session.commit()
            return pay_url, None
        else:
            return None, error

    @classmethod
    def delete_order(cls, order: Order) -> Tuple[bool, Optional[str]]:
        """
        删除订单（仅限已取消且未付款的订单）
        删除前会主动查询 CBB 确认订单确实未付款
        返回: (success, error_message)
        """
        # 只允许删除已取消或已过期的订单
        if order.status not in ('cancelled', 'expired'):
            return False, '只能删除已取消或已过期的订单'

        # 如果有 CBB 交易号，主动查询确认未付款
        if order.transaction_id:
            try:
                cbb_data, error = query_cbb_order(order.transaction_id)
                if cbb_data:
                    cbb_status = cbb_data.get('payStatus')
                    logger.info(f"删除前检查 CBB 状态: {order.order_no} -> {cbb_status}")

                    if cbb_status == 'PAYED':
                        # CBB 显示已付款，先完成支付流程
                        cls.complete_payment(order, order.transaction_id)
                        return False, '该订单已在支付平台完成付款，无法删除'
                elif error:
                    # CBB 查询失败，为安全起见拒绝删除
                    logger.warning(f"CBB 查询失败，拒绝删除: {order.order_no}, error: {error}")
                    return False, f'无法确认支付状态，请稍后重试: {error}'
            except Exception as e:
                logger.error(f"查询 CBB 状态异常: {str(e)}")
                return False, f'查询支付状态失败: {str(e)}'

        try:
            order_no = order.order_no
            db.session.delete(order)
            db.session.commit()
            logger.info(f"订单已删除: {order_no}")
            return True, None
        except Exception as e:
            db.session.rollback()
            logger.error(f"删除订单失败: {str(e)}")
            return False, f'删除订单失败: {str(e)}'
