"""add template_id to projects

Revision ID: f2bbc4c664be
Revises: b65e10b64326
Create Date: 2026-01-13 15:49:22.157205

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'f2bbc4c664be'
down_revision = 'b65e10b64326'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 使用 batch 模式支持 SQLite
    conn = op.get_bind()
    inspector = inspect(conn)

    # 检查 template_id 列是否已存在
    columns = [col['name'] for col in inspector.get_columns('projects')]
    if 'template_id' not in columns:
        with op.batch_alter_table('projects', schema=None) as batch_op:
            batch_op.add_column(sa.Column('template_id', sa.String(length=36), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('template_id')
