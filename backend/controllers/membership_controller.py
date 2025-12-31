"""
会员控制器 - 处理会员相关API请求
"""
from flask import Blueprint, g, request
from utils.auth import login_required
from utils.response import success_response, error_response
from services.membership_service import MembershipService
from models import MembershipPlan, FeaturePermission

membership_bp = Blueprint('membership', __name__, url_prefix='/api/membership')


@membership_bp.route('/plans', methods=['GET'])
def get_plans():
    """获取可购买的会员套餐列表"""
    plans = MembershipPlan.get_purchasable_plans()
    return success_response([plan.to_dict() for plan in plans])


@membership_bp.route('/plans/purchase-info', methods=['GET'])
@login_required
def get_plans_purchase_info():
    """获取套餐购买信息（是否可购买、操作类型等）"""
    user = g.current_user
    plans = MembershipPlan.get_purchasable_plans()

    result = []
    for plan in plans:
        plan_dict = plan.to_dict()
        purchase_info = MembershipService.get_purchase_info(user, plan)
        plan_dict['purchase_info'] = purchase_info
        result.append(plan_dict)

    return success_response(result)


@membership_bp.route('/status', methods=['GET'])
@login_required
def get_status():
    """获取当前用户会员状态"""
    user = g.current_user
    # 检查并重置配额（如果需要）
    MembershipService.check_and_reset_quota_if_needed(user)
    status = MembershipService.get_user_membership_status(user)
    return success_response(status)


@membership_bp.route('/quota', methods=['GET'])
@login_required
def get_quota():
    """获取当前用户配额详情"""
    user = g.current_user
    # 检查并重置配额（如果需要）
    MembershipService.check_and_reset_quota_if_needed(user)
    return success_response({
        'image_quota': user.image_quota,
        'premium_quota': user.premium_quota,
        'quota_reset_at': user.quota_reset_at.isoformat() if user.quota_reset_at else None,
    })


@membership_bp.route('/permissions', methods=['GET'])
def get_permissions():
    """获取功能权限配置列表"""
    permissions = FeaturePermission.query.filter_by(is_active=True).all()
    return success_response([p.to_dict() for p in permissions])


@membership_bp.route('/check/<feature_code>', methods=['GET'])
@login_required
def check_permission(feature_code: str):
    """检查当前用户是否有权限使用某功能"""
    user = g.current_user
    has_permission, error = MembershipService.check_feature_permission(user, feature_code)

    # 获取功能配置
    permission = FeaturePermission.get_by_code(feature_code)
    quota_info = None
    if permission and permission.consume_quota:
        if permission.quota_type == 'image':
            quota_info = {'type': 'image', 'remaining': user.image_quota}
        elif permission.quota_type == 'premium':
            quota_info = {'type': 'premium', 'remaining': user.premium_quota}

    return success_response({
        'has_permission': has_permission,
        'error': error if not has_permission else None,
        'quota': quota_info,
    })
