"""
Notification model - 通知数据模型
"""
import uuid
from datetime import datetime
from . import db


class Notification(db.Model):
    """
    通知模型 - 存储系统通知信息
    用于落地页弹窗和已登录用户的通知展示
    """
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)  # 通知标题
    content = db.Column(db.Text, nullable=False)  # 通知内容（Markdown）
    is_active = db.Column(db.Boolean, default=True, index=True)  # 是否启用
    show_in_popup = db.Column(db.Boolean, default=True, index=True)  # 是否显示在弹窗
    sort_order = db.Column(db.Integer, default=0, index=True)  # 排序（数字越小越靠前）
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_content=True):
        """转换为字典"""
        result = {
            'id': self.id,
            'title': self.title,
            'is_active': self.is_active,
            'show_in_popup': self.show_in_popup,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_content:
            result['content'] = self.content
        return result

    def __repr__(self):
        return f'<Notification {self.title}>'
