"""
Verification Code Service - 验证码生成/校验服务
"""
import re
import logging
from typing import Tuple, Optional
from models import VerificationCode, User
from services.sms_service import sms_client

logger = logging.getLogger(__name__)


class VerificationCodeService:
    """验证码服务类"""

    @staticmethod
    def validate_phone(phone: str) -> Tuple[bool, str]:
        """
        验证手机号格式

        Args:
            phone: 手机号

        Returns:
            (是否有效, 错误信息)
        """
        if not phone:
            return False, '手机号不能为空'

        # 中国大陆手机号：11位数字，1开头
        if not re.match(r'^1[3-9]\d{9}$', phone):
            return False, '请输入有效的手机号'

        return True, ''

    @classmethod
    def send_code(cls, phone: str, purpose: str, ip_address: str = None) -> Tuple[bool, str]:
        """
        发送验证码

        Args:
            phone: 手机号
            purpose: 用途 (register/bind_phone/reset_password/admin_2fa)
            ip_address: 客户端IP

        Returns:
            (是否成功, 消息)
        """
        # 验证手机号格式
        valid, error = cls.validate_phone(phone)
        if not valid:
            return False, error

        # 注册时检查手机号是否已被使用
        if purpose == 'register':
            existing_user = User.query.filter_by(phone=phone).first()
            if existing_user:
                return False, '该手机号已被注册'

        # 绑定手机号时也检查是否已被使用
        if purpose == 'bind_phone':
            existing_user = User.query.filter_by(phone=phone).first()
            if existing_user:
                return False, '该手机号已被其他账户绑定'

        # 重置密码时检查手机号是否存在用户
        if purpose == 'reset_password':
            existing_user = User.query.filter_by(phone=phone).first()
            if not existing_user:
                return False, '该手机号未绑定任何账户'

        # 检查是否可以发送
        can_send, error = VerificationCode.can_send(phone, ip_address)
        if not can_send:
            return False, error

        # 创建验证码
        verification = VerificationCode.create_code(phone, purpose, ip_address)

        # 发送短信
        try:
            logger.info(f"准备发送验证码到 {phone}, 用途: {purpose}")
            result = sms_client.send_sms(phone, verification.code)
            logger.info(f"SMS API 响应: {result}")
            # 检查发送结果 - CBB API 返回 success: True/False 格式
            if result.get('success') is True:
                logger.info(f"验证码发送成功到 {phone}")
                return True, '验证码已发送'
            # 兼容旧格式 code: 0
            if result.get('code') == 0 or result.get('code') == '0':
                logger.info(f"验证码发送成功到 {phone}")
                return True, '验证码已发送'
            # 发送失败
            error_msg = result.get('errorMsg') or result.get('message') or '短信发送失败'
            logger.error(f"短信发送失败: {result}")
            return False, f'短信发送失败: {error_msg}'
        except Exception as e:
            logger.exception(f"短信发送异常: {str(e)}")
            return False, f'短信发送失败: {str(e)}'

    @classmethod
    def verify_code(cls, phone: str, code: str, purpose: str) -> Tuple[bool, str]:
        """
        验证验证码

        Args:
            phone: 手机号
            code: 验证码
            purpose: 用途

        Returns:
            (是否有效, 消息)
        """
        # 验证手机号格式
        valid, error = cls.validate_phone(phone)
        if not valid:
            return False, error

        if not code or len(code) != 6:
            return False, '请输入6位验证码'

        # 获取最新的有效验证码
        verification = VerificationCode.get_latest_valid(phone, purpose)
        if not verification:
            return False, '验证码不存在或已过期'

        # 增加尝试次数
        verification.increment_attempts()

        # 验证码匹配
        if verification.code != code:
            remaining = VerificationCode.MAX_ATTEMPTS - verification.attempts
            if remaining > 0:
                return False, f'验证码错误，还剩{remaining}次机会'
            else:
                return False, '验证码错误次数过多，请重新获取'

        # 标记已使用
        verification.mark_used()
        return True, '验证成功'


# 全局服务实例
verification_service = VerificationCodeService()
