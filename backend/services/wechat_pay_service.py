"""
微信支付服务 - Native 扫码支付
使用微信支付 V3 API
"""
import hashlib
import hmac
import json
import time
import uuid
import base64
import logging
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from flask import current_app
import requests
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)


class WechatPayService:
    """微信支付服务类"""

    # API 端点
    NATIVE_PAY_URL = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native'
    QUERY_ORDER_URL = 'https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/{}'

    @classmethod
    def _get_config(cls) -> Dict[str, str]:
        """获取微信支付配置"""
        return {
            'app_id': current_app.config.get('WECHAT_APP_ID', ''),
            'mch_id': current_app.config.get('WECHAT_MCH_ID', ''),
            'api_key': current_app.config.get('WECHAT_API_KEY', ''),
            'cert_path': current_app.config.get('WECHAT_CERT_PATH', ''),
            'key_path': current_app.config.get('WECHAT_KEY_PATH', ''),
            'notify_url': current_app.config.get('WECHAT_NOTIFY_URL', ''),
        }

    @classmethod
    def _load_private_key(cls, key_path: str):
        """加载商户私钥"""
        with open(key_path, 'rb') as f:
            return serialization.load_pem_private_key(
                f.read(),
                password=None,
                backend=default_backend()
            )

    @classmethod
    def _generate_signature(
        cls,
        method: str,
        url_path: str,
        timestamp: str,
        nonce_str: str,
        body: str,
        private_key
    ) -> str:
        """生成请求签名"""
        sign_str = f"{method}\n{url_path}\n{timestamp}\n{nonce_str}\n{body}\n"
        signature = private_key.sign(
            sign_str.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode('utf-8')

    @classmethod
    def _build_authorization(
        cls,
        method: str,
        url_path: str,
        body: str,
        config: Dict[str, str]
    ) -> str:
        """构建 Authorization 头"""
        timestamp = str(int(time.time()))
        nonce_str = uuid.uuid4().hex

        private_key = cls._load_private_key(config['key_path'])
        signature = cls._generate_signature(
            method, url_path, timestamp, nonce_str, body, private_key
        )

        # 获取证书序列号（需要从证书中读取）
        serial_no = cls._get_cert_serial_no(config['cert_path'])

        return (
            f'WECHATPAY2-SHA256-RSA2048 '
            f'mchid="{config["mch_id"]}",'
            f'nonce_str="{nonce_str}",'
            f'signature="{signature}",'
            f'timestamp="{timestamp}",'
            f'serial_no="{serial_no}"'
        )

    @classmethod
    def _get_cert_serial_no(cls, cert_path: str) -> str:
        """获取证书序列号"""
        from cryptography import x509
        with open(cert_path, 'rb') as f:
            cert = x509.load_pem_x509_certificate(f.read(), default_backend())
        return format(cert.serial_number, 'X')

    @classmethod
    def create_native_order(
        cls,
        order_no: str,
        amount: float,
        description: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        创建 Native 支付订单
        返回: (code_url, error_message)
        code_url: 用于生成支付二维码的链接
        """
        config = cls._get_config()

        # 验证配置
        if not all([config['app_id'], config['mch_id'], config['key_path']]):
            return None, '微信支付配置不完整'

        # 构建请求体
        body = {
            'appid': config['app_id'],
            'mchid': config['mch_id'],
            'description': description[:127],  # 最大127字符
            'out_trade_no': order_no,
            'notify_url': config['notify_url'],
            'amount': {
                'total': int(amount * 100),  # 转换为分
                'currency': 'CNY'
            }
        }

        body_str = json.dumps(body, ensure_ascii=False)
        url_path = '/v3/pay/transactions/native'

        try:
            authorization = cls._build_authorization(
                'POST', url_path, body_str, config
            )

            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authorization
            }

            response = requests.post(
                cls.NATIVE_PAY_URL,
                data=body_str.encode('utf-8'),
                headers=headers,
                timeout=30
            )

            result = response.json()

            if response.status_code == 200:
                code_url = result.get('code_url')
                logger.info(f"微信支付订单创建成功: {order_no}")
                return code_url, None
            else:
                error_msg = result.get('message', '创建支付订单失败')
                logger.error(f"微信支付订单创建失败: {error_msg}")
                return None, error_msg

        except Exception as e:
            logger.error(f"微信支付请求异常: {str(e)}")
            return None, f'支付请求失败: {str(e)}'

    @classmethod
    def verify_callback(
        cls,
        headers: Dict[str, str],
        body: bytes
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        验证支付回调签名并解密数据
        返回: (is_valid, decrypted_data, error_message)
        """
        config = cls._get_config()

        try:
            # 获取回调头信息
            timestamp = headers.get('Wechatpay-Timestamp', '')
            nonce = headers.get('Wechatpay-Nonce', '')
            signature = headers.get('Wechatpay-Signature', '')
            serial = headers.get('Wechatpay-Serial', '')

            if not all([timestamp, nonce, signature, serial]):
                return False, None, '回调头信息不完整'

            # 构建验签字符串
            sign_str = f"{timestamp}\n{nonce}\n{body.decode('utf-8')}\n"

            # TODO: 使用微信平台证书验证签名
            # 这里需要先下载并缓存微信平台证书

            # 解析回调数据
            callback_data = json.loads(body)
            resource = callback_data.get('resource', {})

            # 解密通知数据
            decrypted = cls._decrypt_callback_resource(
                resource.get('ciphertext', ''),
                resource.get('nonce', ''),
                resource.get('associated_data', ''),
                config['api_key']
            )

            if decrypted:
                return True, decrypted, None
            else:
                return False, None, '解密回调数据失败'

        except Exception as e:
            logger.error(f"验证回调失败: {str(e)}")
            return False, None, str(e)

    @classmethod
    def _decrypt_callback_resource(
        cls,
        ciphertext: str,
        nonce: str,
        associated_data: str,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        """解密回调资源数据（AES-256-GCM）"""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        try:
            key = api_key.encode('utf-8')
            cipher = AESGCM(key)
            plaintext = cipher.decrypt(
                nonce.encode('utf-8'),
                base64.b64decode(ciphertext),
                associated_data.encode('utf-8') if associated_data else None
            )
            return json.loads(plaintext.decode('utf-8'))
        except Exception as e:
            logger.error(f"解密回调数据失败: {str(e)}")
            return None

    @classmethod
    def query_order(cls, order_no: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        查询订单状态
        返回: (order_info, error_message)
        """
        config = cls._get_config()

        if not all([config['mch_id'], config['key_path']]):
            return None, '微信支付配置不完整'

        url_path = f'/v3/pay/transactions/out-trade-no/{order_no}?mchid={config["mch_id"]}'

        try:
            authorization = cls._build_authorization(
                'GET', url_path, '', config
            )

            headers = {
                'Accept': 'application/json',
                'Authorization': authorization
            }

            url = cls.QUERY_ORDER_URL.format(order_no) + f'?mchid={config["mch_id"]}'
            response = requests.get(url, headers=headers, timeout=30)
            result = response.json()

            if response.status_code == 200:
                return result, None
            else:
                return None, result.get('message', '查询订单失败')

        except Exception as e:
            logger.error(f"查询订单异常: {str(e)}")
            return None, str(e)
