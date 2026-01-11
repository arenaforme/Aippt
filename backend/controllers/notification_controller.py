"""
Notification Controller - 通知管理 API
"""
from datetime import datetime
from flask import Blueprint, request, g
from sqlalchemy import desc
from utils import success_response, error_response, admin_required, login_required
from models import db, Notification, User, SystemConfig

notification_bp = Blueprint('notification', __name__, url_prefix='/api/notifications')


# ==================== 公开接口（无需认证） ====================

@notification_bp.route('/popup', methods=['GET'])
def get_popup_notifications():
    """
    GET /api/notifications/popup - 获取弹窗通知列表（公开接口）
    返回启用且标记为弹窗显示的通知列表
    """
    # 检查弹窗是否全局启用
    popup_enabled = SystemConfig.get_value('notification_popup_enabled', 'true')
    if popup_enabled.lower() != 'true':
        return success_response({'notifications': [], 'popup_enabled': False})

    notifications = Notification.query.filter_by(
        is_active=True,
        show_in_popup=True
    ).order_by(Notification.sort_order.asc()).all()

    return success_response({
        'notifications': [n.to_dict() for n in notifications],
        'popup_enabled': True
    })


# ==================== 用户接口（需登录） ====================

@notification_bp.route('', methods=['GET'])
@login_required
def get_notifications():
    """
    GET /api/notifications - 获取所有启用的通知（需登录）
    """
    notifications = Notification.query.filter_by(
        is_active=True
    ).order_by(Notification.sort_order.asc()).all()

    return success_response({
        'notifications': [n.to_dict() for n in notifications]
    })


@notification_bp.route('/unread', methods=['GET'])
@login_required
def check_unread():
    """
    GET /api/notifications/unread - 检查是否有未读通知
    """
    user = g.current_user
    last_read = user.last_notification_read_at

    # 查询最新通知的更新时间
    latest = Notification.query.filter_by(is_active=True).order_by(
        desc(Notification.updated_at)
    ).first()

    has_unread = False
    if latest:
        if last_read is None or latest.updated_at > last_read:
            has_unread = True

    return success_response({'has_unread': has_unread})


@notification_bp.route('/mark-read', methods=['POST'])
@login_required
def mark_read():
    """
    POST /api/notifications/mark-read - 标记通知已读
    """
    user = g.current_user
    user.last_notification_read_at = datetime.utcnow()
    db.session.commit()

    return success_response({'message': '已标记为已读'})


# ==================== 管理员接口 ====================

@notification_bp.route('/admin', methods=['GET'])
@admin_required
def admin_list_notifications():
    """
    GET /api/notifications/admin - 获取所有通知（管理员）
    """
    notifications = Notification.query.order_by(
        Notification.sort_order.asc()
    ).all()

    return success_response({
        'notifications': [n.to_dict() for n in notifications]
    })


@notification_bp.route('/admin', methods=['POST'])
@admin_required
def admin_create_notification():
    """
    POST /api/notifications/admin - 创建通知
    Body: { title, content, is_active?, show_in_popup?, sort_order? }
    """
    data = request.get_json()
    if not data:
        return error_response('请求数据不能为空', 400)

    title = data.get('title', '').strip()
    content = data.get('content', '').strip()

    if not title:
        return error_response('标题不能为空', 400)
    if not content:
        return error_response('内容不能为空', 400)

    notification = Notification(
        title=title,
        content=content,
        is_active=data.get('is_active', True),
        show_in_popup=data.get('show_in_popup', True),
        sort_order=data.get('sort_order', 0)
    )
    db.session.add(notification)
    db.session.commit()

    return success_response({
        'notification': notification.to_dict(),
        'message': '通知创建成功'
    })


@notification_bp.route('/admin/<notification_id>', methods=['PUT'])
@admin_required
def admin_update_notification(notification_id):
    """
    PUT /api/notifications/admin/<id> - 更新通知
    Body: { title?, content?, is_active?, show_in_popup?, sort_order? }
    """
    notification = Notification.query.get(notification_id)
    if not notification:
        return error_response('通知不存在', 404)

    data = request.get_json()
    if not data:
        return error_response('请求数据不能为空', 400)

    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return error_response('标题不能为空', 400)
        notification.title = title

    if 'content' in data:
        content = data['content'].strip()
        if not content:
            return error_response('内容不能为空', 400)
        notification.content = content

    if 'is_active' in data:
        notification.is_active = bool(data['is_active'])
    if 'show_in_popup' in data:
        notification.show_in_popup = bool(data['show_in_popup'])
    if 'sort_order' in data:
        notification.sort_order = int(data['sort_order'])

    db.session.commit()

    return success_response({
        'notification': notification.to_dict(),
        'message': '通知更新成功'
    })


@notification_bp.route('/admin/<notification_id>', methods=['DELETE'])
@admin_required
def admin_delete_notification(notification_id):
    """
    DELETE /api/notifications/admin/<id> - 删除通知
    """
    notification = Notification.query.get(notification_id)
    if not notification:
        return error_response('通知不存在', 404)

    db.session.delete(notification)
    db.session.commit()

    return success_response({'message': '通知删除成功'})


@notification_bp.route('/admin/settings', methods=['GET'])
@admin_required
def admin_get_settings():
    """
    GET /api/notifications/admin/settings - 获取通知设置
    """
    popup_enabled = SystemConfig.get_value('notification_popup_enabled', 'true')

    return success_response({
        'popup_enabled': popup_enabled.lower() == 'true'
    })


@notification_bp.route('/admin/settings', methods=['PUT'])
@admin_required
def admin_update_settings():
    """
    PUT /api/notifications/admin/settings - 更新通知设置
    Body: { popup_enabled: boolean }
    """
    data = request.get_json()
    if not data:
        return error_response('请求数据不能为空', 400)

    if 'popup_enabled' in data:
        value = 'true' if data['popup_enabled'] else 'false'
        SystemConfig.set_value('notification_popup_enabled', value)

    return success_response({'message': '设置更新成功'})
