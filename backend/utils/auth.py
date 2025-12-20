"""
Authentication decorators - 认证装饰器
"""
from functools import wraps
from flask import request, g
from .response import error_response
from services.auth_service import AuthService
from models import User


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
