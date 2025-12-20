"""
Authentication Controller - 认证相关 API
"""
from flask import Blueprint, request, g
from utils import success_response, error_response, login_required, get_client_ip
from services.auth_service import AuthService
from models import SystemConfig

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    用户登录
    POST /api/auth/login
    Body: { username, password, remember_me? }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    username = data.get('username', '').strip()
    password = data.get('password', '')
    remember_me = data.get('remember_me', False)

    if not username or not password:
        return error_response('INVALID_CREDENTIALS', '用户名和密码不能为空', 400)

    ip_address = get_client_ip()
    success, token, message, user = AuthService.login(
        username=username,
        password=password,
        remember_me=remember_me,
        ip_address=ip_address
    )

    if not success:
        return error_response('LOGIN_FAILED', message, 401)

    return success_response({
        'token': token,
        'user': user.to_dict()
    }, message)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    用户注册
    POST /api/auth/register
    Body: { username, password }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return error_response('INVALID_CREDENTIALS', '用户名和密码不能为空', 400)

    ip_address = get_client_ip()
    success, message, user = AuthService.register(
        username=username,
        password=password,
        ip_address=ip_address
    )

    if not success:
        return error_response('REGISTER_FAILED', message, 400)

    return success_response({'user': user.to_dict()}, message)


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    用户登出
    POST /api/auth/logout
    """
    ip_address = get_client_ip()
    AuthService.logout(
        user_id=g.current_user.id,
        username=g.current_user.username,
        ip_address=ip_address
    )
    return success_response(None, '登出成功')


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """
    获取当前用户信息
    GET /api/auth/me
    """
    return success_response({'user': g.current_user.to_dict()})


@auth_bp.route('/registration-status', methods=['GET'])
def get_registration_status():
    """
    获取注册开关状态（公开接口）
    GET /api/auth/registration-status
    """
    allowed = SystemConfig.is_registration_allowed()
    return success_response({'allow_registration': allowed})
