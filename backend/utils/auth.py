"""
Authentication decorators - 认证装饰器
"""
from functools import wraps
from flask import request, g
from .response import error_response
from services.auth_service import AuthService
from services.membership_service import MembershipService
from models import User, FeaturePermission


def get_token_from_request() -> str:
    """从请求中提取 JWT Token"""
    # 优先从 Authorization header 获取
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]

    # 其次从 query parameter 获取（用于某些特殊场景）
    return request.args.get('token', '')


def login_required(f):
    """
    登录验证装饰器
    验证用户是否已登录，并将用户信息存入 g.current_user
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return error_response('未提供认证令牌', 401)

        valid, payload, error_msg = AuthService.verify_token(token)
        if not valid:
            return error_response(error_msg, 401)

        # 获取用户信息
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        if not user:
            return error_response('用户不存在', 401)

        if user.status == 'disabled':
            return error_response('账户已被禁用', 403)

        # 存储当前用户信息到 g 对象
        g.current_user = user
        g.token_payload = payload

        return f(*args, **kwargs)
    return decorated_function


def get_current_user_optional():
    """
    可选的用户获取函数（不是装饰器）
    尝试从请求中获取当前用户，如果没有token或token无效则返回None
    用于需要可选认证的场景
    """
    token = get_token_from_request()
    if not token:
        return None

    valid, payload, _ = AuthService.verify_token(token)
    if not valid:
        return None

    user_id = payload.get('user_id')
    user = User.query.get(user_id)
    if not user or user.status == 'disabled':
        return None

    return user


def admin_required(f):
    """
    管理员权限装饰器
    必须在 login_required 之后使用
    """
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if g.current_user.role != 'admin':
            return error_response('需要管理员权限', 403)
        return f(*args, **kwargs)
    return decorated_function


def membership_required(min_level: str = 'free'):
    """
    会员等级权限装饰器
    min_level: 最低所需会员等级 (free/basic/premium)
    """
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            effective_level = user.get_effective_level()

            # 管理员拥有所有权限
            if effective_level == 'admin':
                return f(*args, **kwargs)

            # 检查等级
            level_priority = {'free': 0, 'basic': 1, 'premium': 2}
            user_priority = level_priority.get(effective_level, 0)
            required_priority = level_priority.get(min_level, 0)

            if user_priority < required_priority:
                return error_response(f'需要 {min_level} 等级会员才能使用此功能', 403)

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def feature_required(feature_code: str, consume_quota: bool = True):
    """
    功能权限装饰器
    feature_code: 功能代码
    consume_quota: 是否消耗配额（默认True）
    """
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user = g.current_user

            if consume_quota:
                # 检查权限并消耗配额
                success, error = MembershipService.check_and_consume_quota(user, feature_code)
            else:
                # 仅检查权限，不消耗配额
                success, error = MembershipService.check_feature_permission(user, feature_code)

            if not success:
                return error_response(error, 403)

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_client_ip() -> str:
    """获取客户端 IP 地址"""
    # 优先从 X-Forwarded-For 获取（反向代理场景）
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        # 取第一个 IP（最原始的客户端 IP）
        return forwarded_for.split(',')[0].strip()

    # 其次从 X-Real-IP 获取
    real_ip = request.headers.get('X-Real-IP', '')
    if real_ip:
        return real_ip

    # 最后使用 remote_addr
    return request.remote_addr or ''
