"""add_generated_filename_to_project

Revision ID: 2584fbfb8be0
Revises: 007_replace_mineru_with_docling
Create Date: 2026-01-09 23:06:54.994512

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2584fbfb8be0'
down_revision = '007_replace_mineru_with_docling'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 只添加 generated_filename 列
    op.add_column('projects', sa.Column('generated_filename', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'generated_filename')



