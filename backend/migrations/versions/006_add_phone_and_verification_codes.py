"""add phone field to users and verification_codes table

Revision ID: 006_add_phone_and_verification_codes
Revises: 5dfa7ab1a5bb
Create Date: 2026-01-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '006_add_phone_and_verification_codes'
down_revision = '5dfa7ab1a5bb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """添加 phone 字段到 users 表，创建 verification_codes 表"""
    bind = op.get_bind()
    inspector = inspect(bind)

    # 1. 添加 phone 字段到 users 表（使用 batch 模式支持 SQLite）
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        if 'phone' not in columns:
            # SQLite 不支持直接添加带约束的列，使用 batch 模式
            with op.batch_alter_table('users') as batch_op:
                batch_op.add_column(sa.Column('phone', sa.String(20), nullable=True))
            # 单独创建唯一索引
            op.create_index('ix_users_phone', 'users', ['phone'], unique=True)

    # 2. 创建 verification_codes 表
    if 'verification_codes' not in inspector.get_table_names():
        op.create_table(
            'verification_codes',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('phone', sa.String(20), nullable=False, index=True),
            sa.Column('code', sa.String(6), nullable=False),
            sa.Column('purpose', sa.String(20), default='register', index=True),
            sa.Column('ip_address', sa.String(50), nullable=True),
            sa.Column('attempts', sa.Integer, default=0),
            sa.Column('created_at', sa.DateTime, nullable=False),
            sa.Column('expires_at', sa.DateTime, nullable=False),
            sa.Column('used', sa.Boolean, default=False)
        )


def downgrade() -> None:
    """移除 phone 字段和 verification_codes 表"""
    bind = op.get_bind()
    inspector = inspect(bind)

    # 1. 删除 verification_codes 表
    if 'verification_codes' in inspector.get_table_names():
        op.drop_table('verification_codes')

    # 2. 移除 users 表的 phone 字段
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        if 'phone' in columns:
            op.drop_index('ix_users_phone', table_name='users')
            op.drop_column('users', 'phone')
