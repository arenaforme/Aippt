"""
SystemConfig model - 系统配置模型
"""
import uuid
from datetime import datetime
from . import db


class SystemConfig(db.Model):
    """
    系统配置模型 - 存储系统级配置项
    """
    __tablename__ = 'system_configs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 配置键常量
    KEY_ALLOW_REGISTRATION = 'allow_registration'
    KEY_USER_AGREEMENT = 'user_agreement'
    KEY_MEMBERSHIP_AGREEMENT = 'membership_agreement'

    @classmethod
    def get_value(cls, key: str, default: str = None) -> str:
        """获取配置值"""
        config = cls.query.filter_by(key=key).first()
        if config:
            return config.value
        return default

    @classmethod
    def set_value(cls, key: str, value: str):
        """设置配置值"""
        config = cls.query.filter_by(key=key).first()
        if config:
            config.value = value
        else:
            config = cls(key=key, value=value)
            db.session.add(config)
        db.session.commit()
        return config

    @classmethod
    def is_registration_allowed(cls) -> bool:
        """检查是否允许用户注册"""
        value = cls.get_value(cls.KEY_ALLOW_REGISTRATION, 'true')
        return value.lower() == 'true'

    @classmethod
    def set_registration_allowed(cls, allowed: bool):
        """设置是否允许用户注册"""
        cls.set_value(cls.KEY_ALLOW_REGISTRATION, 'true' if allowed else 'false')

    def to_dict(self):
        """转换为字典"""
        return {
            'key': self.key,
            'value': self.value,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<SystemConfig {self.key}={self.value}>'

    # ==================== 协议相关方法 ====================

    @classmethod
    def get_user_agreement(cls) -> str:
        """获取用户协议内容"""
        return cls.get_value(cls.KEY_USER_AGREEMENT, '')

    @classmethod
    def set_user_agreement(cls, content: str):
        """设置用户协议内容"""
        return cls.set_value(cls.KEY_USER_AGREEMENT, content)

    @classmethod
    def get_membership_agreement(cls) -> str:
        """获取会员协议内容"""
        return cls.get_value(cls.KEY_MEMBERSHIP_AGREEMENT, '')

    @classmethod
    def set_membership_agreement(cls, content: str):
        """设置会员协议内容"""
        return cls.set_value(cls.KEY_MEMBERSHIP_AGREEMENT, content)
