"""
会员管理控制器 - 管理后台会员相关API
"""
from flask import Blueprint, g, request
from utils.auth import admin_required
from utils.response import success_response, error_response
from services.membership_service import MembershipService
from models import db, User, MembershipPlan, FeaturePermission

admin_membership_bp = Blueprint('admin_membership', __name__, url_prefix='/api/admin/membership')


# ==================== 套餐管理 ====================

@admin_membership_bp.route('/plans', methods=['GET'])
@admin_required
def get_all_plans():
    """获取所有套餐列表（含免费套餐）"""
    plans = MembershipPlan.query.order_by(MembershipPlan.sort_order).all()
    return success_response([plan.to_dict() for plan in plans])


@admin_membership_bp.route('/plans', methods=['POST'])
@admin_required
def create_plan():
    """创建新套餐"""
    data = request.get_json()

    required_fields = ['name', 'level', 'period_type']
    for field in required_fields:
        if not data.get(field):
            return error_response(f'缺少必填字段: {field}', 400)

    plan = MembershipPlan(
        name=data['name'],
        level=data['level'],
        period_type=data['period_type'],
        duration_days=data.get('duration_days', 0),
        price=data.get('price', 0),
        image_quota=data.get('image_quota', 0),
        premium_quota=data.get('premium_quota', 0),
        is_active=data.get('is_active', True),
        is_default=data.get('is_default', False),
        sort_order=data.get('sort_order', 0),
    )

    db.session.add(plan)
    db.session.commit()

    return success_response(plan.to_dict(), '套餐创建成功')


@admin_membership_bp.route('/plans/<plan_id>', methods=['PUT'])
@admin_required
def update_plan(plan_id: str):
    """更新套餐"""
    plan = MembershipPlan.query.get(plan_id)
    if not plan:
        return error_response('套餐不存在', 404)

    data = request.get_json()

    # 更新字段
    if 'name' in data:
        plan.name = data['name']
    if 'level' in data:
        plan.level = data['level']
    if 'period_type' in data:
        plan.period_type = data['period_type']
    if 'duration_days' in data:
        plan.duration_days = data['duration_days']
    if 'price' in data:
        plan.price = data['price']
    if 'image_quota' in data:
        plan.image_quota = data['image_quota']
    if 'premium_quota' in data:
        plan.premium_quota = data['premium_quota']
    if 'is_active' in data:
        plan.is_active = data['is_active']
    if 'is_default' in data:
        # 如果设置为默认，取消其他默认套餐
        if data['is_default']:
            MembershipPlan.query.filter(
                MembershipPlan.id != plan_id
            ).update({'is_default': False})
        plan.is_default = data['is_default']
    if 'sort_order' in data:
        plan.sort_order = data['sort_order']

    db.session.commit()
    return success_response(plan.to_dict(), '套餐更新成功')


@admin_membership_bp.route('/plans/<plan_id>', methods=['DELETE'])
@admin_required
def delete_plan(plan_id: str):
    """删除套餐"""
    plan = MembershipPlan.query.get(plan_id)
    if not plan:
        return error_response('套餐不存在', 404)

    if plan.is_default:
        return error_response('不能删除默认套餐', 400)

    # 检查是否有用户正在使用此套餐
    users_count = User.query.filter_by(current_plan_id=plan_id).count()
    if users_count > 0:
        return error_response(f'有 {users_count} 个用户正在使用此套餐，无法删除', 400)

    db.session.delete(plan)
    db.session.commit()
    return success_response(None, '套餐删除成功')


# ==================== 功能权限管理 ====================

@admin_membership_bp.route('/permissions', methods=['GET'])
@admin_required
def get_all_permissions():
    """获取所有功能权限配置"""
    permissions = FeaturePermission.query.all()
    return success_response([p.to_dict() for p in permissions])


@admin_membership_bp.route('/permissions/<permission_id>', methods=['PUT'])
@admin_required
def update_permission(permission_id: str):
    """更新功能权限配置"""
    permission = FeaturePermission.query.get(permission_id)
    if not permission:
        return error_response('权限配置不存在', 404)

    data = request.get_json()

    if 'feature_name' in data:
        permission.feature_name = data['feature_name']
    if 'min_level' in data:
        permission.min_level = data['min_level']
    if 'consume_quota' in data:
        permission.consume_quota = data['consume_quota']
    if 'quota_type' in data:
        permission.quota_type = data['quota_type']
    if 'is_active' in data:
        permission.is_active = data['is_active']

    db.session.commit()
    return success_response(permission.to_dict(), '权限配置更新成功')


# ==================== 用户会员管理 ====================

@admin_membership_bp.route('/users/<user_id>/membership', methods=['PUT'])
@admin_required
def set_user_membership(user_id: str):
    """手动设置用户会员"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)

    data = request.get_json()
    plan_id = data.get('plan_id')

    if not plan_id:
        return error_response('缺少套餐ID', 400)

    plan = MembershipPlan.query.get(plan_id)
    if not plan:
        return error_response('套餐不存在', 404)

    operator_id = g.current_user.id
    MembershipService.activate_membership(user, plan, operator_id)

    return success_response(user.to_dict(include_membership=True), '会员设置成功')


@admin_membership_bp.route('/users/<user_id>/membership', methods=['DELETE'])
@admin_required
def cancel_user_membership(user_id: str):
    """取消用户会员"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)

    operator_id = g.current_user.id
    MembershipService.cancel_membership(user, operator_id)

    return success_response(user.to_dict(include_membership=True), '会员已取消')


@admin_membership_bp.route('/users/<user_id>/quota', methods=['PUT'])
@admin_required
def set_user_quota(user_id: str):
    """手动调整用户配额"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)

    data = request.get_json()

    if 'image_quota' in data:
        user.image_quota = data['image_quota']
    if 'premium_quota' in data:
        user.premium_quota = data['premium_quota']

    db.session.commit()
    return success_response(user.to_dict(include_membership=True), '配额调整成功')
