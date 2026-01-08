"""
CBB SMS Service - CBB 短信服务客户端
"""
import time
import logging
import requests
from typing import Dict
from flask import current_app

logger = logging.getLogger(__name__)


class CBBSmsClient:
    """CBB 短信服务客户端"""

    def __init__(self):
        self._access_token = None
        self._token_expires_at = 0

    @property
    def gateway_url(self) -> str:
        return current_app.config.get('CBB_GATEWAY_URL', 'https://api.webtrn.cn').rstrip('/')

    @property
    def client_id(self) -> str:
        return current_app.config.get('CBB_CLIENT_ID', '')

    @property
    def client_secret(self) -> str:
        return current_app.config.get('CBB_CLIENT_SECRET', '')

    @property
    def customer_code(self) -> str:
        return current_app.config.get('CBB_CUSTOMER_CODE', '')

    @property
    def sign_name(self) -> str:
        return current_app.config.get('SMS_SIGN_NAME', 'AI演示眼')

    @property
    def template_code(self) -> str:
        return current_app.config.get('SMS_TEMPLATE_CODE', 'SMS_500770214')

    def get_access_token(self) -> str:
        """获取访问令牌（带缓存）"""
        if self._access_token and time.time() < self._token_expires_at:
            logger.debug("使用缓存的 access_token")
            return self._access_token

        url = f"{self.gateway_url}/auth/v2/security/oauth/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        logger.info(f"请求 OAuth token: {url}, client_id={self.client_id[:8]}...")

        try:
            resp = requests.post(url, data=data, timeout=30)
            logger.info(f"OAuth 响应状态码: {resp.status_code}")
            resp.raise_for_status()
            result = resp.json()

            self._access_token = result["access_token"]
            # 提前5分钟过期，确保token有效
            self._token_expires_at = time.time() + result["expires_in"] - 300
            logger.info("OAuth token 获取成功")
            return self._access_token
        except Exception as e:
            logger.exception(f"OAuth token 获取失败: {e}")
            raise

    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        return {
            "Authorization": f"Bearer {self.get_access_token()}",
            "x-cbb-client-customer": self.customer_code,
            "x-cbb-client-type": "api",
            "Content-Type": "application/json"
        }

    def send_sms(self, phone: str, code: str) -> dict:
        """
        发送短信验证码

        Args:
            phone: 手机号
            code: 验证码

        Returns:
            API 响应结果
        """
        url = f"{self.gateway_url}/api/v2/notification/send/SMS"
        headers = self._get_headers()

        # 模板内容：您的验证码：${code}，您正在进行身份验证，请勿泄露于他人！
        data = {
            "meta": {"receivers": [phone]},
            "content": {
                "data": {"code": code},
                "extra": {
                    "signName": self.sign_name,
                    "templateCode": self.template_code
                }
            }
        }
        logger.info(f"发送短信: phone={phone}, template={self.template_code}, sign={self.sign_name}")
        logger.debug(f"请求数据: {data}")

        try:
            resp = requests.post(url, headers=headers, json=data, timeout=30)
            logger.info(f"SMS API 响应状态码: {resp.status_code}")
            result = resp.json()
            logger.info(f"SMS API 响应内容: {result}")
            return result
        except Exception as e:
            logger.exception(f"SMS API 请求异常: {e}")
            return {"code": -1, "message": str(e)}


# 全局客户端实例
sms_client = CBBSmsClient()
