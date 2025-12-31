"""
支付回调控制器 - 处理 CBB 聚合支付回调
"""
import json
import logging
from flask import Blueprint, request, Response
from services.order_service import OrderService
from services.cbb_pay_service import get_cbb_client
from models import Order

logger = logging.getLogger(__name__)

payment_callback_bp = Blueprint('payment_callback', __name__, url_prefix='/api/payment')


@payment_callback_bp.route('/cbb/notify', methods=['POST'])
def cbb_notify():
    """
    CBB 聚合支付回调
    支付成功后 CBB 会向此地址发送 POST 请求
    """
    try:
        # 获取回调参数（form-urlencoded 格式）
        params = request.form.to_dict()

        logger.info(f"收到 CBB 支付回调: {params}")

        # 验证签名
        client = get_cbb_client()
        if not client.verify_callback(params):
            logger.error("CBB 回调验签失败")
            return 'FAIL'

        # 解析回调数据
        status = params.get('status')
        out_trade_no = params.get('outTradeNo')  # 业务订单号
        trade_no = params.get('tradeNo')  # CBB 系统订单号
        pay_time = params.get('payTime')
        pay_third = params.get('payThird')  # WE_CHAT 或 ALIPAY

        logger.info(f"CBB 回调: 订单={out_trade_no}, 状态={status}, 支付方式={pay_third}")

        if status == 'SUCCESS':
            order = OrderService.get_order_by_no(out_trade_no)
            if order:
                # 使用 CBB 订单号作为交易号
                success, err = OrderService.complete_payment(order, trade_no)
                if not success:
                    logger.error(f"处理支付完成失败: {err}")
                else:
                    logger.info(f"订单支付完成: {out_trade_no}")
            else:
                logger.warning(f"订单不存在: {out_trade_no}")

        # 返回成功响应
        return 'SUCCESS'

    except Exception as e:
        logger.error(f"处理 CBB 回调异常: {str(e)}")
        return 'FAIL'


# ==================== 保留原有回调接口（兼容性） ====================

@payment_callback_bp.route('/wechat/notify', methods=['POST'])
def wechat_notify():
    """微信支付回调"""
    try:
        headers = dict(request.headers)
        body = request.get_data()

        logger.info(f"收到微信支付回调: {body.decode('utf-8')[:500]}")

        # 验证签名并解密数据
        is_valid, data, error = WechatPayService.verify_callback(headers, body)

        if not is_valid:
            logger.error(f"微信回调验签失败: {error}")
            return Response(
                json.dumps({'code': 'FAIL', 'message': error}),
                status=400,
                content_type='application/json'
            )

        # 处理支付结果
        trade_state = data.get('trade_state')
        order_no = data.get('out_trade_no')
        transaction_id = data.get('transaction_id')

        logger.info(f"微信支付回调: 订单={order_no}, 状态={trade_state}")

        if trade_state == 'SUCCESS':
            order = OrderService.get_order_by_no(order_no)
            if order:
                success, err = OrderService.complete_payment(order, transaction_id)
                if not success:
                    logger.error(f"处理支付完成失败: {err}")

        # 返回成功响应
        return Response(
            json.dumps({'code': 'SUCCESS', 'message': '成功'}),
            status=200,
            content_type='application/json'
        )

    except Exception as e:
        logger.error(f"处理微信回调异常: {str(e)}")
        return Response(
            json.dumps({'code': 'FAIL', 'message': str(e)}),
            status=500,
            content_type='application/json'
        )


@payment_callback_bp.route('/alipay/notify', methods=['POST'])
def alipay_notify():
    """支付宝支付回调"""
    try:
        # 获取回调参数
        params = request.form.to_dict()

        logger.info(f"收到支付宝回调: {params}")

        # 验证签名
        is_valid, error = AlipayService.verify_callback(params)

        if not is_valid:
            logger.error(f"支付宝回调验签失败: {error}")
            return 'fail'

        # 处理支付结果
        trade_status = params.get('trade_status')
        order_no = params.get('out_trade_no')
        transaction_id = params.get('trade_no')

        logger.info(f"支付宝回调: 订单={order_no}, 状态={trade_status}")

        if trade_status in ['TRADE_SUCCESS', 'TRADE_FINISHED']:
            order = OrderService.get_order_by_no(order_no)
            if order:
                success, err = OrderService.complete_payment(order, transaction_id)
                if not success:
                    logger.error(f"处理支付完成失败: {err}")

        # 返回成功响应
        return 'success'

    except Exception as e:
        logger.error(f"处理支付宝回调异常: {str(e)}")
        return 'fail'
