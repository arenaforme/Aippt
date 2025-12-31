"""
支付宝支付服务 - 当面付扫码支付
使用支付宝开放平台 SDK
"""
import json
import logging
import base64
import time
import uuid
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from urllib.parse import quote_plus
from flask import current_app
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)


class AlipayService:
    """支付宝支付服务类"""

    # API 网关
    GATEWAY_URL = 'https://openapi.alipay.com/gateway.do'
    SANDBOX_GATEWAY_URL = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'

    @classmethod
    def _get_config(cls) -> Dict[str, Any]:
        """获取支付宝配置"""
        return {
            'app_id': current_app.config.get('ALIPAY_APP_ID', ''),
            'private_key': current_app.config.get('ALIPAY_PRIVATE_KEY', ''),
            'public_key': current_app.config.get('ALIPAY_PUBLIC_KEY', ''),
            'notify_url': current_app.config.get('ALIPAY_NOTIFY_URL', ''),
            'sandbox': current_app.config.get('ALIPAY_SANDBOX', False),
        }

    @classmethod
    def _get_gateway_url(cls, config: Dict[str, Any]) -> str:
        """获取网关URL"""
        return cls.SANDBOX_GATEWAY_URL if config['sandbox'] else cls.GATEWAY_URL

    @classmethod
    def _sign(cls, params: Dict[str, str], private_key: str) -> str:
        """RSA2 签名"""
        # 按字母顺序排序参数
        sorted_params = sorted(params.items(), key=lambda x: x[0])
        sign_content = '&'.join([f'{k}={v}' for k, v in sorted_params if v])

        # 加载私钥
        key_bytes = private_key.encode('utf-8')
        if not private_key.startswith('-----'):
            key_bytes = f"-----BEGIN RSA PRIVATE KEY-----\n{private_key}\n-----END RSA PRIVATE KEY-----".encode()

        private_key_obj = serialization.load_pem_private_key(
            key_bytes, password=None, backend=default_backend()
        )

        # 签名
        signature = private_key_obj.sign(
            sign_content.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode('utf-8')

    @classmethod
    def _verify_sign(cls, params: Dict[str, str], sign: str, public_key: str) -> bool:
        """验证签名"""
        try:
            # 移除 sign 和 sign_type 参数
            verify_params = {k: v for k, v in params.items() if k not in ['sign', 'sign_type']}
            sorted_params = sorted(verify_params.items(), key=lambda x: x[0])
            sign_content = '&'.join([f'{k}={v}' for k, v in sorted_params if v])

            # 加载公钥
            key_bytes = public_key.encode('utf-8')
            if not public_key.startswith('-----'):
                key_bytes = f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----".encode()

            public_key_obj = serialization.load_pem_public_key(
                key_bytes, backend=default_backend()
            )

            # 验签
            public_key_obj.verify(
                base64.b64decode(sign),
                sign_content.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            logger.error(f"验签失败: {str(e)}")
            return False

    @classmethod
    def create_precreate_order(
        cls,
        order_no: str,
        amount: float,
        subject: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        创建当面付预下单（获取支付二维码）
        返回: (qr_code, error_message)
        """
        config = cls._get_config()

        if not all([config['app_id'], config['private_key']]):
            return None, '支付宝配置不完整'

        # 业务参数
        biz_content = {
            'out_trade_no': order_no,
            'total_amount': f'{amount:.2f}',
            'subject': subject[:256],
        }

        # 公共参数
        params = {
            'app_id': config['app_id'],
            'method': 'alipay.trade.precreate',
            'format': 'JSON',
            'charset': 'utf-8',
            'sign_type': 'RSA2',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'version': '1.0',
            'notify_url': config['notify_url'],
            'biz_content': json.dumps(biz_content, ensure_ascii=False),
        }

        # 签名
        params['sign'] = cls._sign(params, config['private_key'])

        try:
            response = requests.post(
                cls._get_gateway_url(config),
                data=params,
                timeout=30
            )
            result = response.json()

            # 解析响应
            resp_key = 'alipay_trade_precreate_response'
            if resp_key in result:
                resp_data = result[resp_key]
                if resp_data.get('code') == '10000':
                    qr_code = resp_data.get('qr_code')
                    logger.info(f"支付宝预下单成功: {order_no}")
                    return qr_code, None
                else:
                    error_msg = resp_data.get('sub_msg', resp_data.get('msg', '预下单失败'))
                    logger.error(f"支付宝预下单失败: {error_msg}")
                    return None, error_msg
            else:
                return None, '响应格式错误'

        except Exception as e:
            logger.error(f"支付宝请求异常: {str(e)}")
            return None, f'支付请求失败: {str(e)}'

    @classmethod
    def verify_callback(cls, params: Dict[str, str]) -> Tuple[bool, Optional[str]]:
        """
        验证支付回调签名
        返回: (is_valid, error_message)
        """
        config = cls._get_config()

        if not config['public_key']:
            return False, '支付宝公钥未配置'

        sign = params.get('sign', '')
        if not sign:
            return False, '签名不存在'

        is_valid = cls._verify_sign(params, sign, config['public_key'])
        if is_valid:
            return True, None
        else:
            return False, '签名验证失败'

    @classmethod
    def query_order(cls, order_no: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        查询订单状态
        返回: (order_info, error_message)
        """
        config = cls._get_config()

        if not all([config['app_id'], config['private_key']]):
            return None, '支付宝配置不完整'

        biz_content = {'out_trade_no': order_no}

        params = {
            'app_id': config['app_id'],
            'method': 'alipay.trade.query',
            'format': 'JSON',
            'charset': 'utf-8',
            'sign_type': 'RSA2',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'version': '1.0',
            'biz_content': json.dumps(biz_content, ensure_ascii=False),
        }

        params['sign'] = cls._sign(params, config['private_key'])

        try:
            response = requests.post(
                cls._get_gateway_url(config),
                data=params,
                timeout=30
            )
            result = response.json()

            resp_key = 'alipay_trade_query_response'
            if resp_key in result:
                resp_data = result[resp_key]
                if resp_data.get('code') == '10000':
                    return resp_data, None
                else:
                    return None, resp_data.get('sub_msg', resp_data.get('msg', '查询失败'))
            else:
                return None, '响应格式错误'

        except Exception as e:
            logger.error(f"查询订单异常: {str(e)}")
            return None, str(e)
