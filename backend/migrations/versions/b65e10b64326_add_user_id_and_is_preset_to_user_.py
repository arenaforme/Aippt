"""add user_id and is_preset to user_templates

Revision ID: b65e10b64326
Revises: 008_add_notifications
Create Date: 2026-01-12 13:58:49.866425

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b65e10b64326'
down_revision = '008_add_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 使用 batch 模式支持 SQLite
    with op.batch_alter_table('user_templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('is_preset', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.create_foreign_key('fk_user_templates_user_id', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('user_templates', schema=None) as batch_op:
        batch_op.drop_constraint('fk_user_templates_user_id', type_='foreignkey')
        batch_op.drop_column('is_preset')
        batch_op.drop_column('user_id')



