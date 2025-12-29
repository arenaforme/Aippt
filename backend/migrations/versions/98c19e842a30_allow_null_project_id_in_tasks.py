"""allow_null_project_id_in_tasks

Revision ID: 98c19e842a30
Revises: 005_add_must_change_password
Create Date: 2025-12-29 11:04:39.035824

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '98c19e842a30'
down_revision = '005_add_must_change_password'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite 不支持直接 ALTER COLUMN，需要使用 batch 操作
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.alter_column('project_id',
                              existing_type=sa.VARCHAR(length=36),
                              nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.alter_column('project_id',
                              existing_type=sa.VARCHAR(length=36),
                              nullable=False)



