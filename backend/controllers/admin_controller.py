"""
Admin Controller - 管理员功能 API
"""
from flask import Blueprint, request, g
from sqlalchemy import desc
from utils import success_response, error_response, admin_required, get_client_ip, validate_password
from models import db, User, Project, AuditLog, SystemConfig

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    """
    GET /api/admin/users - 获取用户列表
    Query params:
    - limit: 每页数量 (default: 20)
    - offset: 偏移量 (default: 0)
    - search: 搜索用户名
    - role: 按角色过滤 (user/admin)
    - status: 按状态过滤 (active/disabled)
    """
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    search = request.args.get('search', '').strip()
    role = request.args.get('role', '').strip()
    status = request.args.get('status', '').strip()

    query = User.query

    if search:
        query = query.filter(User.username.ilike(f'%{search}%'))
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)

    total = query.count()
    users = query.order_by(desc(User.created_at)).limit(limit).offset(offset).all()

    return success_response({
        'users': [u.to_dict() for u in users],
        'total': total
    })


@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """
    POST /api/admin/users - 创建用户
    Body: { username, password, role? }
    """
    data = request.get_json()
    if not data:
        return error_response('请求数据不能为空', 400)

    username = data.get('username', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'user')

    if not username or not password:
        return error_response('用户名和密码不能为空', 400)

    if len(username) < 3 or len(username) > 50:
        return error_response('用户名长度必须在 3-50 个字符之间', 400)

    # 验证密码强度
    valid, error_msg = validate_password(password)
    if not valid:
        return error_response(error_msg, 400)

    if role not in ['user', 'admin']:
        return error_response('角色必须是 user 或 admin', 400)

    if User.query.filter_by(username=username).first():
        return error_response('用户名已存在', 400)

    user = User(username=username, role=role, status='active')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # 记录审计日志
    AuditLog.log(
        user_id=g.current_user.id,
        username=g.current_user.username,
        action=AuditLog.ACTION_USER_CREATE,
        target_type='user',
        target_id=user.id,
        details=f'创建用户: {username}, 角色: {role}',
        ip_address=get_client_ip(),
        result='success'
    )

    return success_response({'user': user.to_dict()}, '用户创建成功', 201)


@admin_bp.route('/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """
    PUT /api/admin/users/<user_id> - 更新用户信息
    Body: { role?, status? }
    """
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)

    data = request.get_json()
    if not data:
        return error_response('请求数据不能为空', 400)

    changes = []

    if 'role' in data:
        new_role = data['role']
        if new_role not in ['user', 'admin']:
            return error_response('角色必须是 user 或 admin', 400)
        if user.role != new_role:
            changes.append(f'角色: {user.role} -> {new_role}')
            user.role = new_role

    if 'status' in data:
        new_status = data['status']
        if new_status not in ['active', 'disabled']:
            return error_response('状态必须是 active 或 disabled', 400)
        if user.status != new_status:
            changes.append(f'状态: {user.status} -> {new_status}')
            user.status = new_status

    if changes:
        db.session.commit()
        AuditLog.log(
            user_id=g.current_user.id,
            username=g.current_user.username,
            action=AuditLog.ACTION_USER_UPDATE,
            target_type='user',
            target_id=user.id,
            details=f'更新用户 {user.username}: {", ".join(changes)}',
            ip_address=get_client_ip(),
            result='success'
        )

    return success_response({'user': user.to_dict()}, '用户更新成功')


@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """
    DELETE /api/admin/users/<user_id> - 删除用户
    用户的项目将被标记为孤立项目
    """
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)

    # 不能删除自己
    if user.id == g.current_user.id:
        return error_response('不能删除自己的账户', 400)

    username = user.username

    # 将用户的项目标记为孤立
    orphaned_count = Project.query.filter_by(user_id=user_id).update({
        'is_orphaned': True,
        'user_id': None
    })

    # 删除用户
    db.session.delete(user)
    db.session.commit()

    AuditLog.log(
        user_id=g.current_user.id,
        username=g.current_user.username,
        action=AuditLog.ACTION_USER_DELETE,
        target_type='user',
        target_id=user_id,
        details=f'删除用户: {username}, 孤立项目数: {orphaned_count}',
        ip_address=get_client_ip(),
        result='success'
    )

    return success_response({
        'orphaned_projects': orphaned_count
    }, f'用户 {username} 已删除')


@admin_bp.route('/users/<user_id>/reset-password', methods=['POST'])
@admin_required
def reset_user_password(user_id):
    """
    POST /api/admin/users/<user_id>/reset-password - 重置用户密码
    Body: { new_password }
    """
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)

    data = request.get_json()
    if not data or not data.get('new_password'):
        return error_response('新密码不能为空', 400)

    new_password = data['new_password']

    # 验证密码强度
    valid, error_msg = validate_password(new_password)
    if not valid:
        return error_response(error_msg, 400)

    user.set_password(new_password)
    user.login_attempts = 0
    user.locked_until = None
    db.session.commit()

    AuditLog.log(
        user_id=g.current_user.id,
        username=g.current_user.username,
        action=AuditLog.ACTION_USER_PASSWORD_RESET,
        target_type='user',
        target_id=user.id,
        details=f'重置用户 {user.username} 的密码',
        ip_address=get_client_ip(),
        result='success'
    )

    return success_response(None, '密码重置成功')


# ==================== 系统配置管理 ====================

@admin_bp.route('/config', methods=['GET'])
@admin_required
def get_system_config():
    """
    GET /api/admin/config - 获取系统配置
    """
    configs = SystemConfig.query.all()
    return success_response({
        'configs': {c.key: c.value for c in configs},
        'allow_registration': SystemConfig.is_registration_allowed()
    })


@admin_bp.route('/config', methods=['PUT'])
@admin_required
def update_system_config():
    """
    PUT /api/admin/config - 更新系统配置
    Body: { allow_registration?: boolean, ... }
    """
    data = request.get_json()
    if not data:
        return error_response('请求数据不能为空', 400)

    changes = []

    if 'allow_registration' in data:
        old_value = SystemConfig.is_registration_allowed()
        new_value = bool(data['allow_registration'])
        if old_value != new_value:
            SystemConfig.set_registration_allowed(new_value)
            changes.append(f'allow_registration: {old_value} -> {new_value}')

    if changes:
        AuditLog.log(
            user_id=g.current_user.id,
            username=g.current_user.username,
            action=AuditLog.ACTION_SETTINGS_UPDATE,
            target_type='system_config',
            details=', '.join(changes),
            ip_address=get_client_ip(),
            result='success'
        )

    return success_response({
        'allow_registration': SystemConfig.is_registration_allowed()
    }, '配置更新成功')


# ==================== 审计日志管理 ====================

@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def list_audit_logs():
    """
    GET /api/admin/audit-logs - 获取审计日志
    Query params:
    - limit: 每页数量 (default: 50)
    - offset: 偏移量 (default: 0)
    - user_id: 按用户ID过滤
    - username: 按用户名过滤
    - action: 按操作类型过滤
    - result: 按结果过滤 (success/failure)
    - start_date: 开始日期 (ISO format)
    - end_date: 结束日期 (ISO format)
    """
    from datetime import datetime

    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    user_id = request.args.get('user_id', '').strip()
    username = request.args.get('username', '').strip()
    action = request.args.get('action', '').strip()
    result = request.args.get('result', '').strip()
    start_date = request.args.get('start_date', '').strip()
    end_date = request.args.get('end_date', '').strip()

    query = AuditLog.query

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if username:
        query = query.filter(AuditLog.username.ilike(f'%{username}%'))
    if action:
        query = query.filter(AuditLog.action == action)
    if result:
        query = query.filter(AuditLog.result == result)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.created_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.created_at <= end_dt)
        except ValueError:
            pass

    total = query.count()
    logs = query.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset).all()

    return success_response({
        'logs': [log.to_dict() for log in logs],
        'total': total
    })


# ==================== 孤立项目管理 ====================

@admin_bp.route('/orphaned-projects', methods=['GET'])
@admin_required
def list_orphaned_projects():
    """
    GET /api/admin/orphaned-projects - 获取孤立项目列表
    """
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    query = Project.query.filter(Project.is_orphaned == True)
    total = query.count()
    projects = query.order_by(desc(Project.updated_at)).limit(limit).offset(offset).all()

    return success_response({
        'projects': [p.to_dict() for p in projects],
        'total': total
    })


@admin_bp.route('/orphaned-projects/<project_id>/assign', methods=['POST'])
@admin_required
def assign_orphaned_project(project_id):
    """
    POST /api/admin/orphaned-projects/<project_id>/assign - 分配孤立项目给用户
    Body: { user_id }
    """
    project = Project.query.get(project_id)
    if not project:
        return error_response('项目不存在', 404)

    if not project.is_orphaned:
        return error_response('该项目不是孤立项目', 400)

    data = request.get_json()
    if not data or not data.get('user_id'):
        return error_response('用户ID不能为空', 400)

    target_user = User.query.get(data['user_id'])
    if not target_user:
        return error_response('目标用户不存在', 404)

    project.user_id = target_user.id
    project.is_orphaned = False
    db.session.commit()

    AuditLog.log(
        user_id=g.current_user.id,
        username=g.current_user.username,
        action='assign_project',
        target_type='project',
        target_id=project_id,
        details=f'将孤立项目分配给用户: {target_user.username}',
        ip_address=get_client_ip(),
        result='success'
    )

    return success_response({'project': project.to_dict()}, '项目分配成功')
