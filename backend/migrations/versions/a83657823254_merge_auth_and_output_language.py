"""merge_auth_and_output_language

Revision ID: a83657823254
Revises: 004_add_user_auth, 38292967f3ca
Create Date: 2025-12-20 16:40:05.662880

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a83657823254'
down_revision = ('004_add_user_auth', '38292967f3ca')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass



