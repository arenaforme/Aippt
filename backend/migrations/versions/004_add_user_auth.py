"""add user authentication tables

Revision ID: 004_add_user_auth
Revises: a912a64b7a86
Create Date: 2025-12-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from werkzeug.security import generate_password_hash
import uuid
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '004_add_user_auth'
down_revision = 'a912a64b7a86'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    添加用户认证相关表：users, audit_logs, system_configs
    修改 projects 表添加 user_id 和 is_orphaned 字段
    """
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. 创建 users 表
    if 'users' not in existing_tables:
        op.create_table('users',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('username', sa.String(length=50), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('role', sa.String(length=20), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('login_attempts', sa.Integer(), nullable=True),
            sa.Column('locked_until', sa.DateTime(), nullable=True),
            sa.Column('last_login_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_users_username', 'users', ['username'], unique=True)
        op.create_index('ix_users_role', 'users', ['role'], unique=False)
        op.create_index('ix_users_status', 'users', ['status'], unique=False)

    # 2. 创建 audit_logs 表
    if 'audit_logs' not in existing_tables:
        op.create_table('audit_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('username', sa.String(length=50), nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('target_type', sa.String(length=50), nullable=True),
            sa.Column('target_id', sa.String(length=100), nullable=True),
            sa.Column('details', sa.Text(), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('result', sa.String(length=20), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
        op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
        op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'], unique=False)

    # 3. 创建 system_configs 表
    if 'system_configs' not in existing_tables:
        op.create_table('system_configs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('key', sa.String(length=100), nullable=False),
            sa.Column('value', sa.Text(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_system_configs_key', 'system_configs', ['key'], unique=True)

    # 4. 修改 projects 表，添加 user_id 和 is_orphaned 字段
    columns = [col['name'] for col in inspector.get_columns('projects')]
    if 'user_id' not in columns:
        op.add_column('projects', sa.Column('user_id', sa.String(length=36), nullable=True))
        op.create_index('ix_projects_user_id', 'projects', ['user_id'], unique=False)
    if 'is_orphaned' not in columns:
        op.add_column('projects', sa.Column('is_orphaned', sa.Boolean(), nullable=True, server_default='0'))
        op.create_index('ix_projects_is_orphaned', 'projects', ['is_orphaned'], unique=False)

    # 5. 创建默认管理员账户并迁移现有项目
    _create_default_admin_and_migrate_projects(bind)


def _create_default_admin_and_migrate_projects(bind):
    """创建默认管理员并将现有项目关联到管理员"""
    # 检查是否已有管理员
    result = bind.execute(sa.text("SELECT id FROM users WHERE role = 'admin' LIMIT 1"))
    admin = result.fetchone()

    if not admin:
        # 创建默认管理员
        admin_id = str(uuid.uuid4())
        password_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
        now = datetime.utcnow()

        bind.execute(sa.text("""
            INSERT INTO users (id, username, password_hash, role, status, login_attempts, created_at, updated_at)
            VALUES (:id, :username, :password_hash, :role, :status, :login_attempts, :created_at, :updated_at)
        """), {
            'id': admin_id,
            'username': 'admin',
            'password_hash': password_hash,
            'role': 'admin',
            'status': 'active',
            'login_attempts': 0,
            'created_at': now,
            'updated_at': now
        })

        # 将所有现有项目关联到管理员
        bind.execute(sa.text("UPDATE projects SET user_id = :admin_id WHERE user_id IS NULL"), {'admin_id': admin_id})

    # 初始化系统配置：允许注册
    result = bind.execute(sa.text("SELECT id FROM system_configs WHERE key = 'allow_registration' LIMIT 1"))
    if not result.fetchone():
        bind.execute(sa.text("""
            INSERT INTO system_configs (id, key, value, updated_at)
            VALUES (:id, :key, :value, :updated_at)
        """), {
            'id': str(uuid.uuid4()),
            'key': 'allow_registration',
            'value': 'true',
            'updated_at': datetime.utcnow()
        })


def downgrade() -> None:
    """回滚迁移"""
    bind = op.get_bind()
    inspector = inspect(bind)

    # 删除 projects 表的新字段
    columns = [col['name'] for col in inspector.get_columns('projects')]
    if 'is_orphaned' in columns:
        op.drop_index('ix_projects_is_orphaned', table_name='projects')
        op.drop_column('projects', 'is_orphaned')
    if 'user_id' in columns:
        op.drop_index('ix_projects_user_id', table_name='projects')
        op.drop_column('projects', 'user_id')

    # 删除新表
    if 'system_configs' in inspector.get_table_names():
        op.drop_table('system_configs')
    if 'audit_logs' in inspector.get_table_names():
        op.drop_table('audit_logs')
    if 'users' in inspector.get_table_names():
        op.drop_table('users')
