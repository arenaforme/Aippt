"""
功能权限模型 - 存储功能权限配置信息
"""
import uuid
from datetime import datetime
from . import db


class FeaturePermission(db.Model):
    """
    功能权限配置，定义各等级可使用的功能
    """
    __tablename__ = 'feature_permissions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    feature_code = db.Column(db.String(50), unique=True, nullable=False, index=True)  # 功能代码
    feature_name = db.Column(db.String(100), nullable=False)  # 功能名称（显示用）
    min_level = db.Column(db.String(20), nullable=False, default='free')  # 最低所需等级
    consume_quota = db.Column(db.Boolean, default=False)  # 是否消耗配额
    quota_type = db.Column(db.String(20), nullable=True)  # 消耗的配额类型：image/premium
    is_active = db.Column(db.Boolean, default=True)  # 是否启用
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 功能代码常量
    FEATURE_GENERATE_IMAGE = 'generate_image'  # 生成PPT图片
    FEATURE_EXPORT_IMAGE_PPTX = 'export_image_pptx'  # 导出图片PPTX
    FEATURE_EXPORT_PDF = 'export_pdf'  # 导出PDF
    FEATURE_EXPORT_EDITABLE_PPTX = 'export_editable_pptx'  # 导出可编辑PPTX
    FEATURE_PDF_TO_PPTX = 'pdf_to_pptx'  # PDF转可编辑PPTX
    FEATURE_DOWNLOAD = 'download'  # 下载导出文件

    # 配额类型常量
    QUOTA_TYPE_IMAGE = 'image'
    QUOTA_TYPE_PREMIUM = 'premium'

    # 会员等级常量（与 MembershipPlan 保持一致）
    LEVEL_FREE = 'free'
    LEVEL_BASIC = 'basic'
    LEVEL_PREMIUM = 'premium'

    # 等级优先级映射
    LEVEL_PRIORITY = {
        'free': 0,
        'basic': 1,
        'premium': 2,
        'admin': 99,  # 管理员拥有所有权限
    }

    @classmethod
    def get_by_code(cls, feature_code: str) -> 'FeaturePermission':
        """根据功能代码获取权限配置"""
        return cls.query.filter_by(feature_code=feature_code, is_active=True).first()

    @classmethod
    def check_permission(cls, feature_code: str, user_level: str) -> bool:
        """检查用户等级是否有权限使用该功能"""
        # 管理员拥有所有权限
        if user_level == 'admin':
            return True

        permission = cls.get_by_code(feature_code)
        if not permission:
            return False

        user_priority = cls.LEVEL_PRIORITY.get(user_level, 0)
        required_priority = cls.LEVEL_PRIORITY.get(permission.min_level, 0)
        return user_priority >= required_priority

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'id': self.id,
            'feature_code': self.feature_code,
            'feature_name': self.feature_name,
            'min_level': self.min_level,
            'consume_quota': self.consume_quota,
            'quota_type': self.quota_type,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<FeaturePermission {self.feature_code} (min: {self.min_level})>'
