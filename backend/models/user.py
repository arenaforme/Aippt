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

    def to_dict(self, include_sensitive=False):
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
        return data

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'
