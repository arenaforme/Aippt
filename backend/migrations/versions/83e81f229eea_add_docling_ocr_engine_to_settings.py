"""add docling_ocr_engine to settings

Revision ID: 83e81f229eea
Revises: f2bbc4c664be
Create Date: 2026-01-14 10:18:05.611798

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '83e81f229eea'
down_revision = 'f2bbc4c664be'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 添加 docling_ocr_engine 列，默认值为 'easyocr'
    with op.batch_alter_table('settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('docling_ocr_engine', sa.String(length=50), nullable=True))

    # 为已存在的记录设置默认值
    op.execute("UPDATE settings SET docling_ocr_engine = 'easyocr' WHERE docling_ocr_engine IS NULL")


def downgrade() -> None:
    with op.batch_alter_table('settings', schema=None) as batch_op:
        batch_op.drop_column('docling_ocr_engine')
