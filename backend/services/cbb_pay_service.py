"""
CBB 聚合支付服务
基于 CBB 支付网关实现微信和支付宝支付
"""
import base64
import json
import time
import uuid
import logging
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, Tuple
from flask import current_app
import requests

logger = logging.getLogger(__name__)


class CBBPayService:
    """CBB 聚合支付客户端"""

    def __init__(self):
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0

    def _get_config(self) -> Dict[str, str]:
        """获取 CBB 支付配置"""
        return {
            'gateway_url': current_app.config.get('CBB_GATEWAY_URL', 'https://api.webtrn.cn'),
            'client_id': current_app.config.get('CBB_CLIENT_ID', ''),
            'client_secret': current_app.config.get('CBB_CLIENT_SECRET', ''),
            'customer_code': current_app.config.get('CBB_CUSTOMER_CODE', ''),
            'private_key': current_app.config.get('CBB_PRIVATE_KEY', ''),
            'public_key': current_app.config.get('CBB_PUBLIC_KEY', ''),
        }

    def _is_configured(self) -> bool:
        """检查是否已配置"""
        config = self._get_config()
        return all([
            config['client_id'],
            config['client_secret'],
            config['customer_code']
        ])

    def get_access_token(self, force_refresh: bool = False) -> str:
        """获取访问令牌"""
        if not force_refresh and self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        config = self._get_config()
        url = f"{config['gateway_url']}/auth/v2/security/oauth/token"
        data = {
            'grant_type': 'client_credentials',
            'client_id': config['client_id'],
            'client_secret': config['client_secret']
        }

        response = requests.post(url, data=data, timeout=30)
        response.raise_for_status()
        result = response.json()

        self._access_token = result['access_token']
        self._token_expires_at = time.time() + result.get('expires_in', 7200) - 300

        logger.info("CBB access token 获取成功")
        return self._access_token

    def _get_headers(self) -> Dict[str, str]:
        """获取 API 请求头"""
        config = self._get_config()
        return {
            'Authorization': f'Bearer {self.get_access_token()}',
            'x-cbb-client-customer': config['customer_code'],
            'x-cbb-client-type': 'api',
            'Content-Type': 'application/json'
        }

    def _call_api(
        self,
        method: str,
        path: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """调用 CBB API"""
        config = self._get_config()
        url = f"{config['gateway_url']}{path}"
        headers = self._get_headers()

        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data,
            params=params,
            timeout=30
        )

        # 处理 401 错误（token 过期）
        if response.status_code == 401:
            self.get_access_token(force_refresh=True)
            headers = self._get_headers()
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30
            )

        response.raise_for_status()
        return response.json()

    # ==================== 订单接口 ====================

    def create_trade(
        self,
        good_name: str,
        amount: str,
        out_trade_no: str,
        expire_minutes: int = 30,
        business_params: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        创建订单

        Args:
            good_name: 商品名称
            amount: 订单金额（元），如 "100.01"
            out_trade_no: 业务订单号
            expire_minutes: 过期时间（分钟）
            business_params: 业务参数，JSON字符串

        Returns:
            订单信息
        """
        # 计算过期时间（UTC格式）
        expire_time = (datetime.utcnow() + timedelta(minutes=expire_minutes)).strftime('%Y-%m-%dT%H:%M:%SZ')

        data = {
            'goodName': good_name,
            'totalNumber': amount,
            'outTradeNo': out_trade_no,
            'expireTime': expire_time
        }
        if business_params:
            data['businessParams'] = business_params

        return self._call_api('POST', '/api/v2/pay/trade', data=data)

    def query_trade(self, trade_no: str, include_third_pay_data: bool = False) -> Dict[str, Any]:
        """
        查询订单

        Args:
            trade_no: CBB系统订单号
            include_third_pay_data: 是否包含第三方支付数据

        Returns:
            订单信息
        """
        params = {}
        if include_third_pay_data:
            params['includeThirdPayData'] = 'true'

        return self._call_api('GET', f'/api/v2/pay/trade/{trade_no}', params=params)

    def query_trade_by_out_trade_no(self, out_trade_no: str, create_date: str) -> Dict[str, Any]:
        """
        根据业务订单号查询订单

        Args:
            out_trade_no: 业务订单号
            create_date: 订单创建日期，格式：yyyyMMdd

        Returns:
            订单信息
        """
        data = {
            'outTradeNo': out_trade_no,
            'createDate': create_date
        }
        return self._call_api('POST', '/api/v2/pay/trade/outTradeNo', data=data)

    # ==================== 支付二维码接口 ====================

    def get_qr_code(self, trade_no: str, pay_third: str = 'WE_CHAT') -> Dict[str, Any]:
        """
        获取支付二维码

        Args:
            trade_no: CBB系统订单号
            pay_third: 第三方支付类型：WE_CHAT 或 ALIPAY

        Returns:
            二维码信息
        """
        return self._call_api('GET', f'/api/v2/pay/trade/qrCode/{pay_third}/{trade_no}')

    def get_channel(self, environment: str = 'PC') -> Dict[str, Any]:
        """
        获取支付渠道列表

        Args:
            environment: 支付环境：PC, WAP, WE_CHAT_OFFICIAL, WE_CHAT_MINI_PROGRAM, APP

        Returns:
            支付渠道列表
        """
        return self._call_api('GET', f'/api/v2/pay/trade/channel/{environment}')

    # ==================== 退款接口 ====================

    def apply_refund(
        self,
        trade_no: str,
        refund_amount: str,
        out_request_no: str,
        refund_reason: str
    ) -> Dict[str, Any]:
        """
        申请退款

        Args:
            trade_no: CBB系统订单号
            refund_amount: 退款金额
            out_request_no: 退款请求号
            refund_reason: 退款原因

        Returns:
            退款申请结果
        """
        data = {
            'tradeNo': trade_no,
            'refundAmount': refund_amount,
            'outRequestNo': out_request_no,
            'refundReason': refund_reason
        }
        return self._call_api('POST', '/api/v2/pay/refund/apply', data=data)

    def query_refund(self, trade_no: str, out_request_no: str) -> Dict[str, Any]:
        """
        查询退款结果

        Args:
            trade_no: CBB系统订单号
            out_request_no: 退款请求号

        Returns:
            退款结果
        """
        return self._call_api('GET', f'/api/v2/pay/refund/query/{trade_no}/{out_request_no}')

    # ==================== 回调验签 ====================

    def verify_callback(self, params: Dict[str, str]) -> bool:
        """
        验证回调签名

        Args:
            params: 回调参数字典（包含 sign 字段）

        Returns:
            验证是否通过
        """
        config = self._get_config()
        if not config['public_key']:
            logger.warning('CBB 公钥未配置，跳过签名验证')
            return True  # 如果未配置公钥，暂时跳过验证

        try:
            from Crypto.PublicKey import RSA
            from Crypto.Signature import pkcs1_15
            from Crypto.Hash import SHA256
        except ImportError:
            logger.error('请安装 pycryptodome: pip install pycryptodome')
            return False

        # 取出签名
        params = dict(params)
        sign = params.pop('sign', None)
        if not sign:
            logger.error('回调参数中缺少 sign 字段')
            return False

        # 构造签名内容
        sorted_params = sorted([(k, v) for k, v in params.items() if k and v], key=lambda x: x[0])
        content = '&'.join([f'{k}={v}' for k, v in sorted_params])

        # 加载公钥
        try:
            key_bytes = base64.b64decode(config['public_key'])
            key = RSA.import_key(key_bytes)

            # 验证签名
            h = SHA256.new(content.encode('utf-8'))
            pkcs1_15.new(key).verify(h, base64.b64decode(sign))
            return True
        except (ValueError, TypeError) as e:
            logger.error(f'签名验证失败: {str(e)}')
            return False

    # ==================== 页面服务（用于支付宝） ====================

    def _normalize_key(self, key_content: str) -> str:
        """标准化密钥格式：去除 PEM 头尾、换行符和空格"""
        if not key_content:
            return key_content
        for marker in ['-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----',
                       '-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----',
                       '-----BEGIN RSA PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----']:
            key_content = key_content.replace(marker, '')
        return key_content.replace('\n', '').replace('\r', '').replace(' ', '')

    def _get_sign_content(self, params: Dict[str, str]) -> str:
        """将参数按 key 字母序排序并拼接成签名字符串"""
        sorted_params = sorted(
            [(k, v) for k, v in params.items() if k and v],
            key=lambda x: x[0]
        )
        return '&'.join([f'{k}={v}' for k, v in sorted_params])

    def _sign_with_rsa(self, params: Dict[str, str], private_key_b64: str) -> str:
        """使用 RSA 私钥对参数进行 SHA256WithRSA 签名"""
        from Crypto.PublicKey import RSA
        from Crypto.Signature import pkcs1_15
        from Crypto.Hash import SHA256

        content = self._get_sign_content(params)
        key_bytes = base64.b64decode(self._normalize_key(private_key_b64))
        private_key = RSA.import_key(key_bytes)
        h = SHA256.new(content.encode('utf-8'))
        signature = pkcs1_15.new(private_key).sign(h)
        return base64.b64encode(signature).decode('ascii')

    def build_pc_pay_url(self, trade_no: str, turn_url: Optional[str] = None) -> str:
        """
        构建PC端支付页面URL（用于支付宝支付）

        Args:
            trade_no: CBB系统订单号
            turn_url: 支付完成后的回跳地址

        Returns:
            带签名的支付页面URL
        """
        config = self._get_config()
        if not config['private_key']:
            raise ValueError('需要配置 CBB_PRIVATE_KEY 才能使用页面服务')

        params = {
            'client_id': config['client_id'],
            'tradeNo': trade_no,
            'nonceStr': uuid.uuid4().hex,
            'timeStamp': str(int(time.time() * 1000)),
            'charset': 'utf-8'
        }
        if turn_url:
            params['turnUrl'] = turn_url

        # 签名
        sign = self._sign_with_rsa(params, config['private_key'])

        # 构建 URL（双重 URL 编码）
        query_parts = []
        for k, v in sorted(params.items()):
            if k and v:
                encoded = urllib.parse.quote(urllib.parse.quote(str(v), safe=''), safe='')
                query_parts.append(f'{k}={encoded}')
        encoded_sign = urllib.parse.quote(urllib.parse.quote(sign, safe=''), safe='')
        query_parts.append(f'sign={encoded_sign}')

        return f"{config['gateway_url']}/page/v2/pay/trade/pc/toPay?{'&'.join(query_parts)}"


# ==================== 便捷方法（供 OrderService 调用） ====================

# 全局实例
_cbb_client: Optional[CBBPayService] = None


def get_cbb_client() -> CBBPayService:
    """获取 CBB 客户端实例"""
    global _cbb_client
    if _cbb_client is None:
        _cbb_client = CBBPayService()
    return _cbb_client


def create_cbb_order(
    order_no: str,
    amount: float,
    description: str
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    创建 CBB 支付订单并获取支付页面链接

    统一使用页面服务，用户在 CBB 页面选择微信/支付宝支付

    Args:
        order_no: 业务订单号
        amount: 金额（元）
        description: 商品描述

    Returns:
        (pay_url, cbb_trade_no, error_message)
        - pay_url: CBB 支付页面 URL
        - cbb_trade_no: CBB交易号
        - error_message: 错误信息
    """
    client = get_cbb_client()

    if not client._is_configured():
        return None, None, 'CBB 支付配置不完整'

    try:
        # 1. 创建订单
        result = client.create_trade(
            good_name=description,
            amount=f'{amount:.2f}',
            out_trade_no=order_no,
            expire_minutes=30,
            business_params=json.dumps({'order_no': order_no})
        )

        if not result.get('success'):
            error_msg = result.get('message', '创建订单失败')
            logger.error(f'CBB 创建订单失败: {error_msg}')
            return None, None, error_msg

        trade_no = result['data']['tradeNo']
        logger.info(f'CBB 订单创建成功: {trade_no}')

        # 2. 构建支付页面 URL（用户在 CBB 页面选择支付方式）
        try:
            pay_url = client.build_pc_pay_url(trade_no)
            logger.info(f'CBB 支付页面URL构建成功: {order_no}')
            return pay_url, trade_no, None
        except ValueError as e:
            logger.error(f'CBB 页面服务配置错误: {str(e)}')
            return None, trade_no, str(e)

    except Exception as e:
        logger.error(f'CBB 支付请求异常: {str(e)}')
        return None, None, f'支付请求失败: {str(e)}'


def query_cbb_order(trade_no: str) -> Tuple[Optional[Dict], Optional[str]]:
    """
    查询 CBB 订单状态

    Args:
        trade_no: CBB 系统订单号

    Returns:
        (order_info, error_message)
    """
    client = get_cbb_client()

    try:
        result = client.query_trade(trade_no)

        if result.get('success'):
            return result['data'], None
        else:
            return None, result.get('message', '查询失败')

    except Exception as e:
        logger.error(f'CBB 查询订单异常: {str(e)}')
        return None, str(e)
