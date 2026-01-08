"""
VerificationCode model - 验证码数据模型
"""
import uuid
from datetime import datetime, timedelta
from . import db


class VerificationCode(db.Model):
    """
    验证码模型 - 存储短信验证码信息
    """
    __tablename__ = 'verification_codes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = db.Column(db.String(20), nullable=False, index=True)
    code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(20), default='register', index=True)  # register/bind_phone
    ip_address = db.Column(db.String(50), nullable=True)
    attempts = db.Column(db.Integer, default=0)  # 验证尝试次数（最多5次）
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)  # 5分钟后过期
    used = db.Column(db.Boolean, default=False)

    # 常量配置
    CODE_EXPIRE_MINUTES = 5  # 验证码有效期（分钟）
    MAX_ATTEMPTS = 5  # 最大验证尝试次数
    RESEND_INTERVAL_SECONDS = 60  # 重发间隔（秒）
    MAX_DAILY_SENDS_PER_PHONE = 10  # 每个手机号每天最多发送次数
    MAX_DAILY_SENDS_PER_IP = 50  # 每个IP每天最多发送次数

    @classmethod
    def create_code(cls, phone: str, purpose: str, ip_address: str = None) -> 'VerificationCode':
        """创建新的验证码记录"""
        import random
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        expires_at = datetime.utcnow() + timedelta(minutes=cls.CODE_EXPIRE_MINUTES)

        verification = cls(
            phone=phone,
            code=code,
            purpose=purpose,
            ip_address=ip_address,
            expires_at=expires_at
        )
        db.session.add(verification)
        db.session.commit()
        return verification

    def is_expired(self) -> bool:
        """检查验证码是否过期"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """检查验证码是否有效（未过期、未使用、未超过尝试次数）"""
        return not self.is_expired() and not self.used and self.attempts < self.MAX_ATTEMPTS

    def increment_attempts(self):
        """增加验证尝试次数"""
        self.attempts += 1
        db.session.commit()

    def mark_used(self):
        """标记验证码已使用"""
        self.used = True
        db.session.commit()

    @classmethod
    def can_send(cls, phone: str, ip_address: str = None) -> tuple[bool, str]:
        """
        检查是否可以发送验证码
        返回: (是否可以发送, 错误信息)
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 检查重发间隔
        recent = cls.query.filter(
            cls.phone == phone,
            cls.created_at > now - timedelta(seconds=cls.RESEND_INTERVAL_SECONDS)
        ).first()
        if recent:
            return False, f'请{cls.RESEND_INTERVAL_SECONDS}秒后再试'

        # 检查手机号每日发送次数
        phone_count = cls.query.filter(
            cls.phone == phone,
            cls.created_at >= today_start
        ).count()
        if phone_count >= cls.MAX_DAILY_SENDS_PER_PHONE:
            return False, '该手机号今日发送次数已达上限'

        # 检查IP每日发送次数
        if ip_address:
            ip_count = cls.query.filter(
                cls.ip_address == ip_address,
                cls.created_at >= today_start
            ).count()
            if ip_count >= cls.MAX_DAILY_SENDS_PER_IP:
                return False, '当前网络今日发送次数已达上限'

        return True, ''

    @classmethod
    def get_latest_valid(cls, phone: str, purpose: str) -> 'VerificationCode':
        """获取最新的有效验证码"""
        return cls.query.filter(
            cls.phone == phone,
            cls.purpose == purpose,
            cls.used == False,
            cls.expires_at > datetime.utcnow(),
            cls.attempts < cls.MAX_ATTEMPTS
        ).order_by(cls.created_at.desc()).first()

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'phone': self.phone,
            'purpose': self.purpose,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'used': self.used,
        }

    def __repr__(self):
        return f'<VerificationCode {self.phone} ({self.purpose})>'
