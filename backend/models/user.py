"""
User model - 用户数据模型
"""
import uuid
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from . import db


class User(db.Model):
    """
    用户模型 - 存储用户认证和权限信息
    """
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user', index=True)  # user/admin
    status = db.Column(db.String(20), default='active', index=True)  # active/disabled
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    must_change_password = db.Column(db.Boolean, default=False)  # 首次登录强制修改密码
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 会员相关字段
    membership_level = db.Column(db.String(20), default='free', index=True)  # free/basic/premium
    membership_expires_at = db.Column(db.DateTime, nullable=True)  # 会员到期时间
    current_plan_id = db.Column(db.String(36), db.ForeignKey('membership_plans.id'), nullable=True)
    image_quota = db.Column(db.Integer, default=0)  # 图片生成剩余配额
    premium_quota = db.Column(db.Integer, default=0)  # 高级功能剩余配额
    quota_reset_at = db.Column(db.DateTime, nullable=True)  # 配额重置时间

    # 关联：用户的项目
    projects = db.relationship('Project', back_populates='owner', lazy='dynamic')

    def set_password(self, password: str):
        """设置密码（自动加密）"""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password: str) -> bool:
        """验证密码"""
        return check_password_hash(self.password_hash, password)

    def is_locked(self) -> bool:
        """检查账户是否被锁定"""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def is_admin(self) -> bool:
        """检查是否为管理员"""
        return self.role == 'admin'

    def get_effective_level(self) -> str:
        """获取用户的有效会员等级（考虑过期情况）"""
        if self.role == 'admin':
            return 'admin'
        if self.membership_level == 'free':
            return 'free'
        # 检查会员是否过期
        if self.membership_expires_at and self.membership_expires_at < datetime.utcnow():
            return 'free'
        return self.membership_level

    def is_membership_active(self) -> bool:
        """检查会员是否有效"""
        if self.membership_level == 'free':
            return False
        if not self.membership_expires_at:
            return False
        return self.membership_expires_at > datetime.utcnow()

    def has_image_quota(self) -> bool:
        """检查是否有图片生成配额"""
        return self.image_quota > 0

    def has_premium_quota(self) -> bool:
        """检查是否有高级功能配额"""
        return self.premium_quota > 0

    def consume_image_quota(self, amount: int = 1) -> bool:
        """消耗图片生成配额，返回是否成功"""
        if self.role == 'admin':
            return True  # 管理员无限配额
        if self.image_quota >= amount:
            self.image_quota -= amount
            return True
        return False

    def consume_premium_quota(self, amount: int = 1) -> bool:
        """消耗高级功能配额，返回是否成功"""
        if self.role == 'admin':
            return True  # 管理员无限配额
        if self.premium_quota >= amount:
            self.premium_quota -= amount
            return True
        return False

    def to_dict(self, include_sensitive=False, include_membership=False, for_admin=False):
        """转换为字典"""
        data = {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'status': self.status,
            'must_change_password': self.must_change_password,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
        }
        if include_sensitive:
            data['login_attempts'] = self.login_attempts
            data['locked_until'] = self.locked_until.isoformat() if self.locked_until else None
        if include_membership:
            data['membership'] = {
                'level': self.membership_level,
                'effective_level': self.get_effective_level(),
                'expires_at': self.membership_expires_at.isoformat() if self.membership_expires_at else None,
                'is_active': self.is_membership_active(),
                'image_quota': self.image_quota,
                'premium_quota': self.premium_quota,
                'quota_reset_at': self.quota_reset_at.isoformat() if self.quota_reset_at else None,
            }
        # 管理员视图：添加扁平化的会员字段
        if for_admin:
            data['membership_level'] = self.membership_level
            data['membership_expires_at'] = self.membership_expires_at.isoformat() if self.membership_expires_at else None
            data['image_quota'] = self.image_quota
            data['premium_quota'] = self.premium_quota
        return data

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'
