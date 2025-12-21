"""add must_change_password field to users table

Revision ID: 005_add_must_change_password
Revises: a83657823254
Create Date: 2025-12-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '005_add_must_change_password'
down_revision = 'a83657823254'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """添加 must_change_password 字段到 users 表"""
    bind = op.get_bind()
    inspector = inspect(bind)

    # 检查 users 表是否存在
    if 'users' not in inspector.get_table_names():
        return

    # 检查字段是否已存在
    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'must_change_password' not in columns:
        op.add_column('users', sa.Column(
            'must_change_password',
            sa.Boolean(),
            nullable=True,
            server_default='0'
        ))


def downgrade() -> None:
    """移除 must_change_password 字段"""
    bind = op.get_bind()
    inspector = inspect(bind)

    if 'users' not in inspector.get_table_names():
        return

    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'must_change_password' in columns:
        op.drop_column('users', 'must_change_password')
