"""
会员服务模块 - 处理会员相关业务逻辑
"""
import logging
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional, Tuple

from models import db, User, MembershipPlan, FeaturePermission

logger = logging.getLogger(__name__)

# 等级优先级
LEVEL_PRIORITY = {
    MembershipPlan.LEVEL_FREE: 0,
    MembershipPlan.LEVEL_BASIC: 1,
    MembershipPlan.LEVEL_PREMIUM: 2,
}

# 周期优先级
PERIOD_PRIORITY = {
    MembershipPlan.PERIOD_NONE: 0,
    MembershipPlan.PERIOD_MONTHLY: 1,
    MembershipPlan.PERIOD_YEARLY: 2,
}

# 等级中文名称
LEVEL_NAMES = {
    MembershipPlan.LEVEL_FREE: '免费',
    MembershipPlan.LEVEL_BASIC: '基础',
    MembershipPlan.LEVEL_PREMIUM: '高级',
}

# 周期中文名称
PERIOD_NAMES = {
    MembershipPlan.PERIOD_NONE: '免费',
    MembershipPlan.PERIOD_MONTHLY: '月度',
    MembershipPlan.PERIOD_YEARLY: '年度',
}


class MembershipService:
    """会员服务类"""

    @staticmethod
    def get_user_membership_status(user: User) -> dict:
        """获取用户会员状态"""
        effective_level = user.get_effective_level()
        membership_display = MembershipService._get_membership_display(user)
        return {
            'user_id': user.id,
            'level': user.membership_level,
            'effective_level': effective_level,
            'membership_display': membership_display,
            'is_active': user.is_membership_active(),
            'expires_at': user.membership_expires_at.isoformat() if user.membership_expires_at else None,
            'image_quota': user.image_quota,
            'premium_quota': user.premium_quota,
            'quota_reset_at': user.quota_reset_at.isoformat() if user.quota_reset_at else None,
        }

    @staticmethod
    def _get_membership_display(user: User) -> str:
        """
        获取用户会员显示名称
        例如：免费用户、基础月度会员、高级年度会员
        """
        # 免费用户
        if user.membership_level == MembershipPlan.LEVEL_FREE:
            return '免费用户'

        # 会员已过期
        if not user.is_membership_active():
            return '会员已过期'

        # 获取等级名称
        level_name = LEVEL_NAMES.get(user.membership_level, user.membership_level)

        # 获取周期名称
        period_name = ''
        if user.current_plan_id:
            plan = MembershipPlan.query.get(user.current_plan_id)
            if plan and plan.period_type != MembershipPlan.PERIOD_NONE:
                period_name = PERIOD_NAMES.get(plan.period_type, '')

        return f'{level_name}{period_name}会员'

    @staticmethod
    def check_feature_permission(user: User, feature_code: str) -> Tuple[bool, str]:
        """
        检查用户是否有权限使用某功能
        返回: (是否有权限, 错误信息)
        """
        permission = FeaturePermission.get_by_code(feature_code)
        if not permission:
            return False, f'功能 {feature_code} 未配置'

        effective_level = user.get_effective_level()
        if not FeaturePermission.check_permission(feature_code, effective_level):
            return False, f'需要 {permission.min_level} 等级会员才能使用此功能'

        return True, ''

    @staticmethod
    def check_and_consume_quota(
        user: User,
        feature_code: str,
        amount: int = 1
    ) -> Tuple[bool, str]:
        """
        检查权限并消耗配额
        返回: (是否成功, 错误信息)
        """
        # 先检查权限
        has_permission, error = MembershipService.check_feature_permission(user, feature_code)
        if not has_permission:
            return False, error

        permission = FeaturePermission.get_by_code(feature_code)
        if not permission.consume_quota:
            return True, ''

        # 检查并消耗配额
        if permission.quota_type == FeaturePermission.QUOTA_TYPE_IMAGE:
            if not user.consume_image_quota(amount):
                return False, f'图片生成配额不足，剩余 {user.image_quota} 张'
        elif permission.quota_type == FeaturePermission.QUOTA_TYPE_PREMIUM:
            if not user.consume_premium_quota(amount):
                return False, f'高级功能配额不足，剩余 {user.premium_quota} 次'

        db.session.commit()
        return True, ''

    @staticmethod
    def activate_membership(
        user: User,
        plan: MembershipPlan,
        operator_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        为用户开通/续费/升级会员
        返回: (success, error_message)
        """
        now = datetime.utcnow()

        # 检查是否可以购买
        can_purchase, error = MembershipService.can_purchase_plan(user, plan)
        if not can_purchase:
            return False, error

        # 判断操作类型
        op_type, _ = MembershipService._determine_operation_type(user, plan)

        if op_type == 'renew':
            # 续费：只延长时间，配额和重置周期不变
            user.membership_expires_at += timedelta(days=plan.duration_days)
            logger.info(
                f'用户 {user.username} 续费会员: {plan.name}, '
                f'新到期时间={user.membership_expires_at}, '
                f'操作者={operator_id or "system"}'
            )
        else:
            # 新开通/升级/套餐变更：重置一切
            user.membership_level = plan.level
            user.membership_expires_at = now + timedelta(days=plan.duration_days)
            user.current_plan_id = plan.id
            user.image_quota = plan.image_quota
            user.premium_quota = plan.premium_quota
            user.quota_reset_at = MembershipService._calculate_next_reset(
                now, plan.period_type
            )
            logger.info(
                f'用户 {user.username} {op_type}会员: {plan.name}, '
                f'等级={plan.level}, 到期={user.membership_expires_at}, '
                f'配额重置时间={user.quota_reset_at}, '
                f'操作者={operator_id or "system"}'
            )

        db.session.commit()
        return True, None

    @staticmethod
    def can_purchase_plan(user: User, plan: MembershipPlan) -> Tuple[bool, Optional[str]]:
        """
        检查用户是否可以购买指定套餐
        返回: (can_purchase, error_message)
        """
        op_type, error = MembershipService._determine_operation_type(user, plan)
        if error:
            return False, error
        return True, None

    @staticmethod
    def get_purchase_info(user: User, plan: MembershipPlan) -> dict:
        """
        获取购买信息（用于前端显示）
        返回购买类型和相关提示信息
        """
        op_type, error = MembershipService._determine_operation_type(user, plan)

        if error:
            return {
                'can_purchase': False,
                'operation_type': None,
                'error': error,
                'message': error,
            }

        messages = {
            'new': '开通会员',
            'renew': f'续费后有效期将延长 {plan.duration_days} 天',
            'upgrade': '升级后原会员剩余时间将作废，配额将重置',
            'plan_change': '套餐变更后配额将重置',
        }

        return {
            'can_purchase': True,
            'operation_type': op_type,
            'error': None,
            'message': messages.get(op_type, ''),
        }

    @staticmethod
    def _determine_operation_type(
        user: User, plan: MembershipPlan
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        判断购买操作类型
        返回: (operation_type, error_message)
        operation_type: 'new' | 'renew' | 'upgrade' | 'plan_change'
        """
        new_level = plan.level

        # 获取用户实际的会员等级（不考虑管理员角色）
        # 管理员也有自己的会员等级，购买时应基于实际会员等级判断
        current_level = user.membership_level
        is_membership_active = user.is_membership_active()

        # 如果会员已过期，视为免费用户
        if current_level != 'free' and not is_membership_active:
            current_level = 'free'

        # 如果用户是免费，视为新开通
        if current_level == 'free':
            return 'new', None

        # 获取当前套餐的周期类型
        current_plan = MembershipPlan.query.get(user.current_plan_id) if user.current_plan_id else None
        current_period = current_plan.period_type if current_plan else MembershipPlan.PERIOD_NONE
        new_period = plan.period_type

        # 计算优先级差异
        level_diff = LEVEL_PRIORITY.get(new_level, 0) - LEVEL_PRIORITY.get(current_level, 0)
        period_diff = PERIOD_PRIORITY.get(new_period, 0) - PERIOD_PRIORITY.get(current_period, 0)

        # 等级降级：禁止
        if level_diff < 0:
            current_name = LEVEL_NAMES.get(current_level, current_level)
            new_name = LEVEL_NAMES.get(new_level, new_level)
            return None, f'您当前是{current_name}会员，无法购买{new_name}套餐'

        # 等级升级：允许（不管周期如何变化）
        if level_diff > 0:
            return 'upgrade', None

        # 等级相同，检查周期
        if period_diff < 0:
            current_period_name = PERIOD_NAMES.get(current_period, current_period)
            new_period_name = PERIOD_NAMES.get(new_period, new_period)
            return None, f'您当前是{current_period_name}套餐，无法购买{new_period_name}套餐'
        elif period_diff > 0:
            return 'plan_change', None  # 月度→年度
        else:
            return 'renew', None  # 同级同周期续费

    @staticmethod
    def _calculate_next_reset(from_time: datetime, period_type: str) -> Optional[datetime]:
        """
        计算下次配额重置时间
        注意：无论月度还是年度会员，配额都按月重置
        年度会员的优势是价格折扣，而非更长的配额周期
        """
        if period_type in [MembershipPlan.PERIOD_MONTHLY, MembershipPlan.PERIOD_YEARLY]:
            return from_time + relativedelta(months=1)
        else:
            return None

    @staticmethod
    def cancel_membership(user: User, operator_id: Optional[str] = None) -> bool:
        """取消用户会员（恢复为免费用户）"""
        default_plan = MembershipPlan.get_default_plan()
        if not default_plan:
            logger.error('未找到默认免费套餐')
            return False

        user.membership_level = 'free'
        user.membership_expires_at = None
        user.current_plan_id = None
        user.image_quota = default_plan.image_quota
        user.premium_quota = 0

        db.session.commit()

        logger.info(f'用户 {user.username} 会员已取消, 操作者={operator_id or "system"}')
        return True

    @staticmethod
    def reset_user_quota(user: User) -> bool:
        """
        重置用户配额（用于定时任务或访问时检查）
        根据用户当前会员状态和套餐周期重置配额
        """
        now = datetime.utcnow()

        # 检查会员是否有效
        if not user.is_membership_active():
            # 会员已过期或免费用户，使用免费套餐配额
            default_plan = MembershipPlan.get_default_plan()
            if default_plan:
                user.image_quota = default_plan.image_quota
                user.premium_quota = default_plan.premium_quota
            else:
                user.image_quota = 0
                user.premium_quota = 0
            user.quota_reset_at = None
            logger.info(f'用户 {user.username} 配额重置为免费套餐配额')
        else:
            # 会员有效，使用当前套餐配额
            if user.current_plan_id:
                plan = MembershipPlan.query.get(user.current_plan_id)
                if plan:
                    user.image_quota = plan.image_quota
                    user.premium_quota = plan.premium_quota
                    # 计算下次重置时间
                    user.quota_reset_at = MembershipService._calculate_next_reset(
                        now, plan.period_type
                    )
                    logger.info(
                        f'用户 {user.username} 配额重置: '
                        f'image={plan.image_quota}, premium={plan.premium_quota}, '
                        f'下次重置={user.quota_reset_at}'
                    )

        db.session.commit()
        return True

    @staticmethod
    def check_and_reset_quota_if_needed(user: User) -> bool:
        """
        检查用户配额是否需要重置，如果需要则重置
        返回: True 表示进行了重置，False 表示不需要重置
        """
        now = datetime.utcnow()

        # 如果没有设置重置时间，不需要重置
        if not user.quota_reset_at:
            return False

        # 如果还没到重置时间，不需要重置
        if now < user.quota_reset_at:
            return False

        # 需要重置
        MembershipService.reset_user_quota(user)
        return True
