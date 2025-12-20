"""
Authentication Service - JWT 认证服务
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Tuple
from flask import current_app

from models import db, User, AuditLog, SystemConfig


class AuthService:
    """认证服务类"""

    # Token 过期时间配置
    TOKEN_EXPIRE_HOURS = 24  # 普通登录 24 小时
    TOKEN_EXPIRE_DAYS_REMEMBER = 7  # "记住我" 7 天

    # 账户锁定配置
    MAX_LOGIN_ATTEMPTS = 5  # 最大登录尝试次数
    LOCK_DURATION_MINUTES = 30  # 锁定时长（分钟）

    @classmethod
    def generate_token(cls, user: User, remember_me: bool = False) -> str:
        """
        生成 JWT Token

        Args:
            user: 用户对象
            remember_me: 是否记住登录状态

        Returns:
            JWT token 字符串
        """
        if remember_me:
            expire = datetime.utcnow() + timedelta(days=cls.TOKEN_EXPIRE_DAYS_REMEMBER)
        else:
            expire = datetime.utcnow() + timedelta(hours=cls.TOKEN_EXPIRE_HOURS)

        payload = {
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'exp': expire,
            'iat': datetime.utcnow(),
        }

        secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key')
        token = jwt.encode(payload, secret_key, algorithm='HS256')
        return token

    @classmethod
    def verify_token(cls, token: str) -> Tuple[bool, Optional[dict], str]:
        """
        验证 JWT Token

        Args:
            token: JWT token 字符串

        Returns:
            (是否有效, payload 或 None, 错误信息)
        """
        try:
            secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return True, payload, ''
        except jwt.ExpiredSignatureError:
            return False, None, 'Token 已过期'
        except jwt.InvalidTokenError as e:
            return False, None, f'无效的 Token: {str(e)}'

    @classmethod
    def login(cls, username: str, password: str, remember_me: bool = False,
              ip_address: str = None) -> Tuple[bool, Optional[str], str, Optional[User]]:
        """
        用户登录

        Args:
            username: 用户名
            password: 密码
            remember_me: 是否记住登录
            ip_address: 客户端 IP 地址

        Returns:
            (是否成功, token 或 None, 消息, 用户对象或 None)
        """
        user = User.query.filter_by(username=username).first()

        if not user:
            cls._log_login_attempt(None, username, ip_address, False, '用户不存在')
            return False, None, '用户名或密码错误', None

        # 检查账户状态
        if user.status == 'disabled':
            cls._log_login_attempt(user.id, username, ip_address, False, '账户已禁用')
            return False, None, '账户已被禁用，请联系管理员', None

        # 检查账户是否被锁定
        if user.is_locked():
            cls._log_login_attempt(user.id, username, ip_address, False, '账户已锁定')
            return False, None, f'账户已锁定，请 {cls.LOCK_DURATION_MINUTES} 分钟后重试', None

        # 验证密码
        if not user.check_password(password):
            user.login_attempts += 1
            # 达到最大尝试次数，锁定账户
            if user.login_attempts >= cls.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=cls.LOCK_DURATION_MINUTES)
                db.session.commit()
                cls._log_login_attempt(user.id, username, ip_address, False, '密码错误，账户已锁定')
                return False, None, f'密码错误次数过多，账户已锁定 {cls.LOCK_DURATION_MINUTES} 分钟', None
            db.session.commit()
            remaining = cls.MAX_LOGIN_ATTEMPTS - user.login_attempts
            cls._log_login_attempt(user.id, username, ip_address, False, '密码错误')
            return False, None, f'用户名或密码错误，还剩 {remaining} 次尝试机会', None

        # 登录成功，重置登录尝试次数
        user.login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.utcnow()
        db.session.commit()

        # 生成 token
        token = cls.generate_token(user, remember_me)
        cls._log_login_attempt(user.id, username, ip_address, True, '登录成功')

        return True, token, '登录成功', user

    @classmethod
    def register(cls, username: str, password: str, ip_address: str = None) -> Tuple[bool, str, Optional[User]]:
        """
        用户注册

        Args:
            username: 用户名
            password: 密码
            ip_address: 客户端 IP 地址

        Returns:
            (是否成功, 消息, 用户对象或 None)
        """
        # 检查是否允许注册
        if not SystemConfig.is_registration_allowed():
            return False, '系统当前不允许新用户注册', None

        # 检查用户名是否已存在
        if User.query.filter_by(username=username).first():
            return False, '用户名已存在', None

        # 验证用户名格式
        if len(username) < 3 or len(username) > 50:
            return False, '用户名长度必须在 3-50 个字符之间', None

        # 验证密码强度
        if len(password) < 6:
            return False, '密码长度不能少于 6 个字符', None

        # 创建用户
        user = User(username=username, role='user', status='active')
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user.id,
            username=username,
            action=AuditLog.ACTION_REGISTER,
            target_type='user',
            target_id=user.id,
            details='用户自助注册',
            ip_address=ip_address,
            result='success'
        )

        return True, '注册成功', user

    @classmethod
    def logout(cls, user_id: str, username: str, ip_address: str = None) -> bool:
        """
        用户登出

        Args:
            user_id: 用户 ID
            username: 用户名
            ip_address: 客户端 IP 地址

        Returns:
            是否成功
        """
        AuditLog.log(
            user_id=user_id,
            username=username,
            action=AuditLog.ACTION_LOGOUT,
            details='用户登出',
            ip_address=ip_address,
            result='success'
        )
        return True

    @classmethod
    def get_current_user(cls, token: str) -> Optional[User]:
        """
        根据 token 获取当前用户

        Args:
            token: JWT token

        Returns:
            用户对象或 None
        """
        valid, payload, _ = cls.verify_token(token)
        if not valid or not payload:
            return None

        user_id = payload.get('user_id')
        if not user_id:
            return None

        return User.query.get(user_id)

    @classmethod
    def _log_login_attempt(cls, user_id: Optional[str], username: str,
                           ip_address: str, success: bool, details: str):
        """记录登录尝试"""
        AuditLog.log(
            user_id=user_id,
            username=username,
            action=AuditLog.ACTION_LOGIN,
            details=details,
            ip_address=ip_address,
            result='success' if success else 'failure'
        )
