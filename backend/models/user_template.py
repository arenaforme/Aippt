"""
User Template model - stores user-uploaded templates
"""
import uuid
from datetime import datetime
from . import db


class UserTemplate(db.Model):
    """
    User Template model - represents a user-uploaded template

    模板分为两类：
    - 预设模板 (is_preset=True): 管理员上传，所有用户可见
    - 用户模板 (is_preset=False): 用户上传，仅上传者可见
    """
    __tablename__ = 'user_templates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)  # 用户模板绑定用户，预设模板为 NULL
    is_preset = db.Column(db.Boolean, nullable=False, default=False)  # 是否为预设模板
    name = db.Column(db.String(200), nullable=True)  # Optional template name
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)  # File size in bytes
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联用户
    user = db.relationship('User', backref=db.backref('templates', lazy='dynamic'))

    def to_dict(self, include_user=False):
        """Convert to dictionary"""
        result = {
            'template_id': self.id,
            'name': self.name,
            'is_preset': self.is_preset,
            'template_image_url': f'/files/user-templates/{self.id}/{self.file_path.split("/")[-1]}',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_user and self.user:
            result['user_id'] = self.user_id
            result['username'] = self.user.username
        return result
    
    def __repr__(self):
        return f'<UserTemplate {self.id}: {self.name or "Unnamed"}>'

