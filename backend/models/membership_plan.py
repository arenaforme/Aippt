"""
会员套餐模型 - 存储会员套餐配置信息
"""
import uuid
from datetime import datetime
from decimal import Decimal
from . import db


class MembershipPlan(db.Model):
    """
    会员套餐配置，包括免费套餐
    """
    __tablename__ = 'membership_plans'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), nullable=False)  # 套餐名称：免费用户/基础月度/高级年度等
    level = db.Column(db.String(20), nullable=False, index=True)  # free/basic/premium
    period_type = db.Column(db.String(20), nullable=False)  # monthly/yearly/none(免费)
    duration_days = db.Column(db.Integer, default=0)  # 有效天数：30/365/0(免费)
    price = db.Column(db.Numeric(10, 2), default=Decimal('0.00'))  # 价格（元），免费套餐为0
    image_quota = db.Column(db.Integer, default=0)  # 图片生成配额
    premium_quota = db.Column(db.Integer, default=0)  # 高级功能配额
    is_active = db.Column(db.Boolean, default=True)  # 是否启用
    is_default = db.Column(db.Boolean, default=False)  # 是否为默认免费套餐
    sort_order = db.Column(db.Integer, default=0)  # 排序顺序
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 等级常量
    LEVEL_FREE = 'free'
    LEVEL_BASIC = 'basic'
    LEVEL_PREMIUM = 'premium'

    # 周期类型常量
    PERIOD_NONE = 'none'
    PERIOD_MONTHLY = 'monthly'
    PERIOD_YEARLY = 'yearly'

    @classmethod
    def get_default_plan(cls) -> 'MembershipPlan':
        """获取默认免费套餐"""
        return cls.query.filter_by(is_default=True, is_active=True).first()

    @classmethod
    def get_active_plans(cls) -> list:
        """获取所有启用的套餐（按排序顺序）"""
        return cls.query.filter_by(is_active=True).order_by(cls.sort_order).all()

    @classmethod
    def get_purchasable_plans(cls) -> list:
        """获取可购买的套餐（排除免费套餐）"""
        return cls.query.filter(
            cls.is_active == True,
            cls.level != cls.LEVEL_FREE
        ).order_by(cls.sort_order).all()

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'level': self.level,
            'period_type': self.period_type,
            'duration_days': self.duration_days,
            'price': float(self.price) if self.price else 0,
            'image_quota': self.image_quota,
            'premium_quota': self.premium_quota,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<MembershipPlan {self.name} ({self.level})>'
