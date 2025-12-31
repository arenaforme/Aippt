"""
Order Model - 订单模型
用于记录会员购买订单
"""
from datetime import datetime
import uuid
from . import db


class Order(db.Model):
    """会员订单"""
    __tablename__ = 'orders'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_no = db.Column(db.String(32), unique=True, nullable=False, index=True)  # 订单号
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    plan_id = db.Column(db.String(36), db.ForeignKey('membership_plans.id'), nullable=False)

    # 金额信息
    amount = db.Column(db.Numeric(10, 2), nullable=False)  # 支付金额（元）

    # 订单状态: pending(待支付), paid(已支付), cancelled(已取消), refunded(已退款), expired(已过期)
    status = db.Column(db.String(20), default='pending', nullable=False)

    # 支付信息
    payment_method = db.Column(db.String(20), nullable=True)  # wechat/alipay
    payment_time = db.Column(db.DateTime, nullable=True)  # 支付时间
    transaction_id = db.Column(db.String(64), nullable=True)  # 第三方交易号

    # 支付二维码（用于扫码支付）
    qr_code_url = db.Column(db.String(512), nullable=True)  # 支付二维码URL

    # 订单过期时间（未支付订单的有效期）
    expires_at = db.Column(db.DateTime, nullable=True)

    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联
    user = db.relationship('User', backref=db.backref('orders', lazy='dynamic'))
    plan = db.relationship('MembershipPlan', backref=db.backref('orders', lazy='dynamic'))

    @staticmethod
    def generate_order_no():
        """生成订单号: 时间戳 + 随机数"""
        import random
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        return f'{timestamp}{random_suffix}'

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'order_no': self.order_no,
            'user_id': self.user_id,
            'plan_id': self.plan_id,
            'plan_name': self.plan.name if self.plan else None,
            'amount': float(self.amount) if self.amount else 0,
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_time': self.payment_time.isoformat() if self.payment_time else None,
            'transaction_id': self.transaction_id,
            'qr_code_url': self.qr_code_url,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Order {self.order_no}>'
