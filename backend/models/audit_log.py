"""
AuditLog model - 审计日志模型
"""
import uuid
from datetime import datetime
from . import db


class AuditLog(db.Model):
    """
    审计日志模型 - 记录系统关键操作
    """
    __tablename__ = 'audit_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    username = db.Column(db.String(50), nullable=False)  # 冗余存储，用户删除后仍可查看
    action = db.Column(db.String(50), nullable=False, index=True)
    target_type = db.Column(db.String(50), nullable=True)  # user/project/settings
    target_id = db.Column(db.String(100), nullable=True)
    details = db.Column(db.Text, nullable=True)  # JSON 格式的详细信息
    ip_address = db.Column(db.String(45), nullable=True)  # 支持 IPv6
    result = db.Column(db.String(20), nullable=False, default='success')  # success/failure
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # 关联
    user = db.relationship('User', backref=db.backref('audit_logs', lazy='dynamic'))

    # 操作类型常量
    ACTION_LOGIN = 'login'
    ACTION_LOGOUT = 'logout'
    ACTION_REGISTER = 'register'
    ACTION_PASSWORD_CHANGE = 'password_change'
    ACTION_USER_CREATE = 'user_create'
    ACTION_USER_UPDATE = 'user_update'
    ACTION_USER_DELETE = 'user_delete'
    ACTION_USER_PASSWORD_RESET = 'user_password_reset'
    ACTION_PROJECT_DELETE = 'project_delete'
    ACTION_PROJECT_ASSIGN = 'project_assign'
    ACTION_SETTINGS_UPDATE = 'settings_update'

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'result': self.result,
            'created_at': (self.created_at.isoformat() + 'Z') if self.created_at else None,
        }

    def __repr__(self):
        return f'<AuditLog {self.action} by {self.username}>'

    @classmethod
    def log(cls, user_id: str, username: str, action: str,
            target_type: str = None, target_id: str = None,
            details: str = None, ip_address: str = None,
            result: str = 'success'):
        """
        记录审计日志的便捷类方法

        Args:
            user_id: 用户ID
            username: 用户名
            action: 操作类型
            target_type: 目标类型 (user/project/settings)
            target_id: 目标ID
            details: 详细信息 (JSON字符串)
            ip_address: IP地址
            result: 结果 (success/failure)
        """
        log_entry = cls(
            user_id=user_id,
            username=username,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            result=result
        )
        db.session.add(log_entry)
        db.session.commit()
        return log_entry
