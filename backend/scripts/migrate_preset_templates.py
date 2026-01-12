#!/usr/bin/env python
"""
迁移脚本：将硬编码的预设模板导入到数据库中

之前的预设模板是硬编码在前端代码中的，现在需要迁移到数据库中。
模板图片文件位于 frontend/public/templates/ 目录。
"""
import os
import sys
import uuid
import shutil
from datetime import datetime

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db
from models.user_template import UserTemplate

# 预设模板配置（与之前前端硬编码的一致）
PRESET_TEMPLATES = [
    {'name': '复古卷轴', 'filename': 'template_y.png'},
    {'name': '矢量插画', 'filename': 'template_vector_illustration.png'},
    {'name': '拟物玻璃', 'filename': 'template_glass.png'},
    {'name': '科技蓝', 'filename': 'template_b.png'},
    {'name': '简约商务', 'filename': 'template_s.png'},
    {'name': '学术报告', 'filename': 'template_academic.jpg'},
]


def migrate_preset_templates():
    """迁移预设模板到数据库"""
    app = create_app()

    with app.app_context():
        # 获取路径配置
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        frontend_templates_dir = os.path.join(
            project_root, '..', 'frontend', 'public', 'templates'
        )
        # 上传目录（项目根目录下的 uploads）
        uploads_root = os.path.join(project_root, '..', 'uploads')

        print(f"源目录: {frontend_templates_dir}")
        print(f"上传根目录: {uploads_root}")
        print()

        migrated_count = 0
        skipped_count = 0

        for template_config in PRESET_TEMPLATES:
            name = template_config['name']
            filename = template_config['filename']

            # 检查是否已存在同名预设模板
            existing = UserTemplate.query.filter_by(
                name=name, is_preset=True
            ).first()

            if existing:
                print(f"跳过: {name} (已存在)")
                skipped_count += 1
                continue

            # 源文件路径
            src_path = os.path.join(frontend_templates_dir, filename)
            if not os.path.exists(src_path):
                print(f"警告: 源文件不存在 - {src_path}")
                continue

            # 生成模板 ID
            template_id = str(uuid.uuid4())

            # 目标目录和文件路径（与用户模板格式一致）
            template_dir = os.path.join(uploads_root, 'user-templates', template_id)
            os.makedirs(template_dir, exist_ok=True)

            # 保持原始扩展名
            ext = os.path.splitext(filename)[1]
            new_filename = f"template{ext}"
            dst_path = os.path.join(template_dir, new_filename)

            # 复制文件
            shutil.copy2(src_path, dst_path)

            # 相对路径（与现有用户模板格式一致）
            relative_path = f"user-templates/{template_id}/{new_filename}"

            # 创建数据库记录
            template = UserTemplate(
                id=template_id,
                user_id=None,  # 预设模板没有所属用户
                is_preset=True,
                name=name,
                file_path=relative_path,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.session.add(template)

            print(f"导入: {name} -> {relative_path}")
            migrated_count += 1

        # 提交事务
        db.session.commit()

        print()
        print(f"迁移完成: 导入 {migrated_count} 个, 跳过 {skipped_count} 个")

        # 显示当前所有预设模板
        print()
        print("当前预设模板列表:")
        presets = UserTemplate.query.filter_by(is_preset=True).all()
        for p in presets:
            print(f"  - {p.name}: {p.file_path}")


if __name__ == '__main__':
    migrate_preset_templates()
