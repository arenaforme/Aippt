"""add notifications table and user last_notification_read_at field

Revision ID: 008_add_notifications
Revises: 2584fbfb8be0
Create Date: 2026-01-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '008_add_notifications'
down_revision = '2584fbfb8be0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """创建 notifications 表，添加 last_notification_read_at 字段到 users 表"""
    bind = op.get_bind()
    inspector = inspect(bind)

    # 1. 创建 notifications 表
    if 'notifications' not in inspector.get_table_names():
        op.create_table(
            'notifications',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('title', sa.String(200), nullable=False),
            sa.Column('content', sa.Text, nullable=False),
            sa.Column('is_active', sa.Boolean, default=True, index=True),
            sa.Column('show_in_popup', sa.Boolean, default=True, index=True),
            sa.Column('sort_order', sa.Integer, default=0, index=True),
            sa.Column('created_at', sa.DateTime, nullable=False),
            sa.Column('updated_at', sa.DateTime, nullable=True)
        )

    # 2. 添加 last_notification_read_at 字段到 users 表
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        if 'last_notification_read_at' not in columns:
            with op.batch_alter_table('users') as batch_op:
                batch_op.add_column(
                    sa.Column('last_notification_read_at', sa.DateTime, nullable=True)
                )


def downgrade() -> None:
    """删除 notifications 表和 last_notification_read_at 字段"""
    bind = op.get_bind()
    inspector = inspect(bind)

    # 1. 移除 users 表的 last_notification_read_at 字段
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        if 'last_notification_read_at' in columns:
            with op.batch_alter_table('users') as batch_op:
                batch_op.drop_column('last_notification_read_at')

    # 2. 删除 notifications 表
    if 'notifications' in inspector.get_table_names():
        op.drop_table('notifications')
