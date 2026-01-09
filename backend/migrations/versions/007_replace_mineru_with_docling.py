"""replace mineru with docling in settings table

Revision ID: 007_replace_mineru_with_docling
Revises: 006_add_phone_and_verification_codes
Create Date: 2025-01-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '007_replace_mineru_with_docling'
down_revision = '006_add_phone_and_verification_codes'
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Check if column exists"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """
    Replace MinerU columns with Docling column in settings table.
    - Remove: mineru_api_base, mineru_token
    - Add: docling_api_base

    Idempotent: checks if columns exist before modifying.
    """
    # Add docling_api_base column
    if not _column_exists('settings', 'docling_api_base'):
        op.add_column('settings', sa.Column(
            'docling_api_base', sa.String(length=255), nullable=True
        ))

    # Remove mineru columns (if they exist)
    if _column_exists('settings', 'mineru_api_base'):
        op.drop_column('settings', 'mineru_api_base')

    if _column_exists('settings', 'mineru_token'):
        op.drop_column('settings', 'mineru_token')


def downgrade() -> None:
    """
    Restore MinerU columns and remove Docling column.
    """
    # Add back mineru columns
    if not _column_exists('settings', 'mineru_api_base'):
        op.add_column('settings', sa.Column(
            'mineru_api_base', sa.String(length=255), nullable=True
        ))

    if not _column_exists('settings', 'mineru_token'):
        op.add_column('settings', sa.Column(
            'mineru_token', sa.String(length=500), nullable=True
        ))

    # Remove docling column
    if _column_exists('settings', 'docling_api_base'):
        op.drop_column('settings', 'docling_api_base')
