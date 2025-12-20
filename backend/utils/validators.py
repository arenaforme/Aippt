"""
Data validation utilities
"""
from typing import Set

# Project status states
PROJECT_STATUSES = {
    'DRAFT', 
    'OUTLINE_GENERATED', 
    'DESCRIPTIONS_GENERATED', 
    'GENERATING_IMAGES', 
    'COMPLETED'
}

# Page status states
PAGE_STATUSES = {
    'DRAFT', 
    'DESCRIPTION_GENERATED', 
    'GENERATING', 
    'COMPLETED', 
    'FAILED'
}

# Task status states
TASK_STATUSES = {
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
}

# Task types
TASK_TYPES = {
    'GENERATE_DESCRIPTIONS',
    'GENERATE_IMAGES'
}


def validate_project_status(status: str) -> bool:
    """Validate project status"""
    return status in PROJECT_STATUSES


def validate_page_status(status: str) -> bool:
    """Validate page status"""
    return status in PAGE_STATUSES


def validate_task_status(status: str) -> bool:
    """Validate task status"""
    return status in TASK_STATUSES


def validate_task_type(task_type: str) -> bool:
    """Validate task type"""
    return task_type in TASK_TYPES


def allowed_file(filename: str, allowed_extensions: Set[str]) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def validate_password(password: str) -> tuple:
    """
    验证密码强度
    规则：至少8位，必须包含字母和数字

    Args:
        password: 待验证的密码

    Returns:
        tuple: (是否有效, 错误消息)
    """
    if len(password) < 8:
        return False, '密码长度不能少于8个字符'

    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)

    if not has_letter:
        return False, '密码必须包含字母'
    if not has_digit:
        return False, '密码必须包含数字'

    return True, ''

