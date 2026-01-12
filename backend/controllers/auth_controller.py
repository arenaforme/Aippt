"""
Authentication Controller - 认证相关 API
"""
from flask import Blueprint, request, g
from utils import success_response, error_response, login_required, get_client_ip
from services.auth_service import AuthService
from services.verification_code_service import verification_service
from models import SystemConfig

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    用户登录
    POST /api/auth/login
    Body: { username, password, remember_me? }

    管理员登录需要二次认证，返回:
    { requires_2fa: true, temp_token: "...", phone_hint: "138****1234" }
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

    # 管理员需要二次认证（token 为 None 表示需要二次认证）
    # 仅当系统配置启用了管理员二次认证时才执行
    if success and token is None and user.role == 'admin' and SystemConfig.is_admin_2fa_enabled():
        # 检查管理员是否绑定了手机号
        if not user.phone:
            return error_response('ADMIN_NO_PHONE', '管理员账户未绑定手机号，请联系超级管理员', 400)

        # 发送验证码到管理员手机
        send_success, send_msg = verification_service.send_code(
            user.phone, 'admin_2fa', ip_address
        )
        if not send_success:
            return error_response('SEND_CODE_FAILED', f'发送验证码失败: {send_msg}', 500)

        # 生成临时 token
        temp_token = AuthService.generate_temp_token(user)

        return success_response({
            'requires_2fa': True,
            'temp_token': temp_token,
            'phone_hint': AuthService.mask_phone(user.phone),
            'remember_me': remember_me  # 传递给二次认证使用
        }, '请输入短信验证码完成二次认证')

    # 管理员二次认证关闭时，直接生成 token
    if success and token is None and user.role == 'admin':
        token = AuthService.generate_token(user, remember_me)

    # 普通用户登录成功（或管理员二次认证关闭时）
    need_phone_verification = not user.phone

    return success_response({
        'token': token,
        'user': user.to_dict(),
        'need_phone_verification': need_phone_verification
    }, message)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    用户注册
    POST /api/auth/register
    Body: { username, password, phone, code }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    username = data.get('username', '').strip()
    password = data.get('password', '')
    phone = data.get('phone', '').strip()
    code = data.get('code', '').strip()

    if not username or not password:
        return error_response('INVALID_CREDENTIALS', '用户名和密码不能为空', 400)

    if not phone or not code:
        return error_response('INVALID_REQUEST', '手机号和验证码不能为空', 400)

    # 验证验证码
    valid, msg = verification_service.verify_code(phone, code, 'register')
    if not valid:
        return error_response('VERIFICATION_FAILED', msg, 400)

    ip_address = get_client_ip()
    success, message, user = AuthService.register(
        username=username,
        password=password,
        phone=phone,
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
    return success_response({'user': g.current_user.to_dict(include_membership=True)})


@auth_bp.route('/registration-status', methods=['GET'])
def get_registration_status():
    """
    获取注册开关状态（公开接口）
    GET /api/auth/registration-status
    """
    allowed = SystemConfig.is_registration_allowed()
    return success_response({'allow_registration': allowed})


@auth_bp.route('/agreements/<agreement_type>', methods=['GET'])
def get_public_agreement(agreement_type):
    """
    获取协议内容（公开接口）
    GET /api/auth/agreements/<agreement_type>
    agreement_type: user_agreement 或 membership_agreement
    """
    if agreement_type == 'user_agreement':
        content = SystemConfig.get_user_agreement()
    elif agreement_type == 'membership_agreement':
        content = SystemConfig.get_membership_agreement()
    else:
        return error_response('INVALID_TYPE', '无效的协议类型', 400)

    return success_response({
        'type': agreement_type,
        'content': content
    })


@auth_bp.route('/change-password', methods=['PUT'])
@login_required
def change_password():
    """
    修改当前用户密码
    PUT /api/auth/change-password
    Body: { old_password, new_password }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not old_password or not new_password:
        return error_response('INVALID_REQUEST', '旧密码和新密码不能为空', 400)

    ip_address = get_client_ip()
    success, message = AuthService.change_password(
        user=g.current_user,
        old_password=old_password,
        new_password=new_password,
        ip_address=ip_address
    )

    if not success:
        return error_response('CHANGE_PASSWORD_FAILED', message, 400)

    return success_response(None, message)


@auth_bp.route('/send-code', methods=['POST'])
def send_verification_code():
    """
    发送验证码
    POST /api/auth/send-code
    Body: { phone, purpose }
    purpose: register（注册）或 bind_phone（绑定手机号）
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    phone = data.get('phone', '').strip()
    purpose = data.get('purpose', 'register')

    if purpose not in ['register', 'bind_phone']:
        return error_response('INVALID_REQUEST', '无效的用途类型', 400)

    ip_address = get_client_ip()
    success, message = verification_service.send_code(phone, purpose, ip_address)

    if not success:
        return error_response('SEND_CODE_FAILED', message, 400)

    return success_response(None, message)


@auth_bp.route('/bind-phone', methods=['POST'])
@login_required
def bind_phone():
    """
    绑定手机号（已登录用户）
    POST /api/auth/bind-phone
    Body: { phone, code }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    phone = data.get('phone', '').strip()
    code = data.get('code', '').strip()

    if not phone or not code:
        return error_response('INVALID_REQUEST', '手机号和验证码不能为空', 400)

    # 验证验证码
    valid, msg = verification_service.verify_code(phone, code, 'bind_phone')
    if not valid:
        return error_response('VERIFICATION_FAILED', msg, 400)

    ip_address = get_client_ip()
    success, message = AuthService.bind_phone(
        user=g.current_user,
        phone=phone,
        ip_address=ip_address
    )

    if not success:
        return error_response('BIND_PHONE_FAILED', message, 400)

    return success_response({'user': g.current_user.to_dict()}, message)


@auth_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """
    获取当前用户详细信息
    GET /api/auth/profile
    """
    user = g.current_user
    return success_response({
        'user': user.to_dict(include_membership=True)
    })


@auth_bp.route('/forgot-password/send-code', methods=['POST'])
def forgot_password_send_code():
    """
    忘记密码 - 发送验证码
    POST /api/auth/forgot-password/send-code
    Body: { username }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    username = data.get('username', '').strip()
    if not username:
        return error_response('INVALID_REQUEST', '用户名不能为空', 400)

    # 查找用户
    from models import User
    user = User.query.filter_by(username=username).first()
    if not user:
        return error_response('USER_NOT_FOUND', '用户不存在', 404)

    # 检查用户是否绑定手机号
    if not user.phone:
        return error_response('NO_PHONE', '该账户未绑定手机号，请联系管理员重置密码', 400)

    # 发送验证码
    ip_address = get_client_ip()
    success, message = verification_service.send_code(user.phone, 'reset_password', ip_address)

    if not success:
        return error_response('SEND_CODE_FAILED', message, 400)

    return success_response({
        'phone_hint': AuthService.mask_phone(user.phone)
    }, '验证码已发送')


@auth_bp.route('/forgot-password/reset', methods=['POST'])
def forgot_password_reset():
    """
    忘记密码 - 重置密码
    POST /api/auth/forgot-password/reset
    Body: { username, code, new_password }
    """
    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    username = data.get('username', '').strip()
    code = data.get('code', '').strip()
    new_password = data.get('new_password', '')

    if not username or not code or not new_password:
        return error_response('INVALID_REQUEST', '用户名、验证码和新密码不能为空', 400)

    ip_address = get_client_ip()
    success, message = AuthService.reset_password_by_code(
        username=username,
        code=code,
        new_password=new_password,
        ip_address=ip_address
    )

    if not success:
        return error_response('RESET_FAILED', message, 400)

    return success_response(None, message)


@auth_bp.route('/verify-admin', methods=['POST'])
def verify_admin_2fa():
    """
    管理员二次认证
    POST /api/auth/verify-admin
    Body: { temp_token, code, remember_me? }
    """
    from models import User

    data = request.get_json()
    if not data:
        return error_response('INVALID_REQUEST', '请求数据不能为空', 400)

    temp_token = data.get('temp_token', '')
    code = data.get('code', '').strip()
    remember_me = data.get('remember_me', False)

    if not temp_token or not code:
        return error_response('INVALID_REQUEST', '临时令牌和验证码不能为空', 400)

    # 验证临时 token
    valid, user_id, error_msg = AuthService.verify_temp_token(temp_token)
    if not valid:
        return error_response('INVALID_TOKEN', error_msg, 401)

    # 获取用户
    user = User.query.get(user_id)
    if not user:
        return error_response('USER_NOT_FOUND', '用户不存在', 404)

    if user.role != 'admin':
        return error_response('NOT_ADMIN', '非管理员用户', 403)

    if not user.phone:
        return error_response('ADMIN_NO_PHONE', '管理员账户未绑定手机号', 400)

    # 验证短信验证码
    valid, msg = verification_service.verify_code(user.phone, code, 'admin_2fa')
    if not valid:
        return error_response('VERIFICATION_FAILED', msg, 400)

    # 验证通过，生成正式 token
    ip_address = get_client_ip()
    token = AuthService.generate_token(user, remember_me)

    # 记录审计日志
    from models import AuditLog
    AuditLog.log(
        user_id=user.id,
        username=user.username,
        action=AuditLog.ACTION_LOGIN,
        details='管理员二次认证成功',
        ip_address=ip_address,
        result='success'
    )

    return success_response({
        'token': token,
        'user': user.to_dict()
    }, '登录成功')
