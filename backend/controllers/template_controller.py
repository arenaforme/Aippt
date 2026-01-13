"""
Template Controller - handles template-related endpoints
"""
import logging
from flask import Blueprint, request, current_app, g
from sqlalchemy import or_
from models import db, Project, UserTemplate
from utils import success_response, error_response, not_found, bad_request, allowed_file
from utils.auth import login_required, admin_required
from services import FileService
from datetime import datetime

logger = logging.getLogger(__name__)

template_bp = Blueprint('templates', __name__, url_prefix='/api/projects')
user_template_bp = Blueprint('user_templates', __name__, url_prefix='/api/user-templates')


@template_bp.route('/<project_id>/template', methods=['POST'])
@login_required
def upload_template(project_id):
    """
    POST /api/projects/{project_id}/template - Upload template image
    
    Content-Type: multipart/form-data
    Form: template_image=@file.png
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Check if file is in request
        if 'template_image' not in request.files:
            return bad_request("No file uploaded")
        
        file = request.files['template_image']
        
        if file.filename == '':
            return bad_request("No file selected")
        
        # Validate file extension
        if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            return bad_request("Invalid file type. Allowed types: png, jpg, jpeg, gif, webp")
        
        # Save template
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_path = file_service.save_template_image(file, project_id)
        
        # Update project
        project.template_image_path = file_path
        project.template_id = None  # 直接上传的模板没有关联的模板ID
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response({
            'template_image_url': f'/files/{project_id}/template/{file_path.split("/")[-1]}'
        })
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@template_bp.route('/<project_id>/template-from-id', methods=['POST'])
@login_required
def set_template_from_id(project_id):
    """
    POST /api/projects/{project_id}/template-from-id - 通过模板ID设置项目模板

    优化：避免前端下载再上传的冗余操作，直接在服务器端复制文件

    Body: { "template_id": "xxx" }
    """
    import shutil

    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        data = request.get_json()
        if not data or 'template_id' not in data:
            return bad_request("Missing template_id")

        template_id = data['template_id']

        # 查找模板（支持用户模板和预设模板）
        template = UserTemplate.query.filter(
            UserTemplate.id == template_id,
            or_(
                UserTemplate.is_preset == True,  # 预设模板所有人可用
                UserTemplate.user_id == g.current_user.id  # 用户自己的模板
            )
        ).first()

        if not template:
            return not_found('Template')

        # 获取源文件路径
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        source_path = file_service.upload_folder / template.file_path

        if not source_path.exists():
            return error_response('FILE_NOT_FOUND', '模板文件不存在', 404)

        # 复制到项目模板目录
        template_dir = file_service._get_template_dir(project_id)
        ext = source_path.suffix or '.png'
        dest_filename = f"template{ext}"
        dest_path = template_dir / dest_filename

        shutil.copy2(str(source_path), str(dest_path))

        # 更新项目
        project.template_image_path = dest_path.relative_to(file_service.upload_folder).as_posix()
        project.template_id = template_id  # 保存选中的模板ID
        project.updated_at = datetime.utcnow()

        db.session.commit()

        return success_response({
            'template_image_url': f'/files/{project_id}/template/{dest_filename}',
            'template_id': template_id
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting template from ID: {e}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@template_bp.route('/<project_id>/template', methods=['DELETE'])
@login_required
def delete_template(project_id):
    """
    DELETE /api/projects/{project_id}/template - Delete template
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        if not project.template_image_path:
            return bad_request("No template to delete")
        
        # Delete template file
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_template(project_id)
        
        # Update project
        project.template_image_path = None
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return success_response(message="Template deleted successfully")
    
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@template_bp.route('/templates', methods=['GET'])
@login_required
def get_system_templates():
    """
    GET /api/templates - Get system preset templates
    
    Note: This is a placeholder for future implementation
    """
    # TODO: Implement system templates
    templates = []
    
    return success_response({
        'templates': templates
    })


# ========== User Template Endpoints ==========

@user_template_bp.route('', methods=['POST'])
@login_required
def upload_user_template():
    """
    POST /api/user-templates - Upload user template image

    Content-Type: multipart/form-data
    Form: template_image=@file.png
    Optional: name=Template Name

    用户上传的模板自动绑定到当前用户
    """
    try:
        # Check if file is in request
        if 'template_image' not in request.files:
            return bad_request("No file uploaded")

        file = request.files['template_image']

        if file.filename == '':
            return bad_request("No file selected")

        # Validate file extension
        if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            return bad_request("Invalid file type. Allowed types: png, jpg, jpeg, gif, webp")

        # Get optional name
        name = request.form.get('name', None)

        # Get file size before saving
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning

        # Generate template ID first
        import uuid
        template_id = str(uuid.uuid4())

        # Save template file first (using the generated ID)
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_path = file_service.save_user_template(file, template_id)

        # Create template record with file_path already set
        # 绑定当前用户，标记为用户模板
        template = UserTemplate(
            id=template_id,
            user_id=g.current_user.id,
            is_preset=False,
            name=name,
            file_path=file_path,
            file_size=file_size
        )
        db.session.add(template)
        db.session.commit()

        return success_response(template.to_dict())

    except Exception as e:
        import traceback
        db.session.rollback()
        error_msg = str(e)
        logger.error(f"Error uploading user template: {error_msg}", exc_info=True)
        # 在开发环境中返回详细错误，生产环境返回通用错误
        if current_app.config.get('DEBUG', False):
            return error_response('SERVER_ERROR', f"{error_msg}\n{traceback.format_exc()}", 500)
        else:
            return error_response('SERVER_ERROR', error_msg, 500)


@user_template_bp.route('', methods=['GET'])
@login_required
def list_user_templates():
    """
    GET /api/user-templates - Get list of user templates

    返回：预设模板 + 当前用户的模板
    """
    try:
        current_user_id = g.current_user.id

        # 查询预设模板和当前用户的模板
        templates = UserTemplate.query.filter(
            or_(
                UserTemplate.is_preset == True,
                UserTemplate.user_id == current_user_id
            )
        ).order_by(
            UserTemplate.is_preset.desc(),  # 预设模板在前
            UserTemplate.created_at.desc()
        ).all()

        return success_response({
            'templates': [template.to_dict() for template in templates]
        })

    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@user_template_bp.route('/<template_id>', methods=['DELETE'])
@login_required
def delete_user_template(template_id):
    """
    DELETE /api/user-templates/{template_id} - Delete user template

    权限校验：
    - 只能删除自己的用户模板
    - 不能通过此接口删除预设模板
    """
    try:
        template = UserTemplate.query.get(template_id)

        if not template:
            return not_found('UserTemplate')

        # 权限校验：不能删除预设模板
        if template.is_preset:
            return error_response('FORBIDDEN', '不能删除预设模板', 403)

        # 权限校验：只能删除自己的模板
        if template.user_id != g.current_user.id:
            return error_response('FORBIDDEN', '只能删除自己的模板', 403)

        # Delete template file
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_user_template(template_id)

        # Delete template record
        db.session.delete(template)
        db.session.commit()

        return success_response(message="Template deleted successfully")

    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


# ========== Admin Preset Template Endpoints ==========

admin_preset_template_bp = Blueprint('admin_preset_templates', __name__, url_prefix='/api/admin/preset-templates')


@admin_preset_template_bp.route('', methods=['GET'])
@admin_required
def admin_list_preset_templates():
    """
    GET /api/admin/preset-templates - 获取预设模板列表（管理员）
    Query params: limit, offset
    """
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)

    total = UserTemplate.query.filter_by(is_preset=True).count()

    templates = UserTemplate.query.filter_by(is_preset=True).order_by(
        UserTemplate.created_at.desc()
    ).offset(offset).limit(limit).all()

    return success_response({
        'templates': [t.to_dict() for t in templates],
        'total': total
    })


@admin_preset_template_bp.route('', methods=['POST'])
@admin_required
def admin_create_preset_template():
    """
    POST /api/admin/preset-templates - 上传预设模板（管理员）

    Content-Type: multipart/form-data
    Form: template_image=@file.png, name=模板名称
    """
    try:
        if 'template_image' not in request.files:
            return bad_request("No file uploaded")

        file = request.files['template_image']

        if file.filename == '':
            return bad_request("No file selected")

        if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            return bad_request("Invalid file type")

        name = request.form.get('name', '').strip()
        if not name:
            return bad_request("模板名称不能为空")

        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)

        import uuid
        template_id = str(uuid.uuid4())

        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_path = file_service.save_user_template(file, template_id)

        template = UserTemplate(
            id=template_id,
            user_id=None,  # 预设模板不绑定用户
            is_preset=True,
            name=name,
            file_path=file_path,
            file_size=file_size
        )
        db.session.add(template)
        db.session.commit()

        return success_response({
            'template': template.to_dict(),
            'message': '预设模板创建成功'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating preset template: {e}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@admin_preset_template_bp.route('/<template_id>', methods=['DELETE'])
@admin_required
def admin_delete_preset_template(template_id):
    """
    DELETE /api/admin/preset-templates/<id> - 删除预设模板（管理员）
    """
    try:
        template = UserTemplate.query.get(template_id)

        if not template:
            return not_found('Template')

        if not template.is_preset:
            return bad_request("只能通过此接口删除预设模板")

        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_user_template(template_id)

        db.session.delete(template)
        db.session.commit()

        return success_response({'message': '预设模板删除成功'})

    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@admin_preset_template_bp.route('/<template_id>', methods=['PUT'])
@admin_required
def admin_update_preset_template(template_id):
    """
    PUT /api/admin/preset-templates/<id> - 更新预设模板名称（管理员）

    JSON Body: { "name": "新模板名称" }
    """
    try:
        template = UserTemplate.query.get(template_id)

        if not template:
            return not_found('Template')

        if not template.is_preset:
            return bad_request("只能通过此接口修改预设模板")

        data = request.get_json()
        if not data:
            return bad_request("请求体不能为空")

        name = data.get('name', '').strip()
        if not name:
            return bad_request("模板名称不能为空")

        template.name = name
        db.session.commit()

        return success_response({
            'template': template.to_dict(),
            'message': '预设模板更新成功'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating preset template: {e}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


# ========== Admin User Template Management Endpoints ==========

admin_user_template_bp = Blueprint('admin_user_templates', __name__, url_prefix='/api/admin/user-templates')


@admin_user_template_bp.route('', methods=['GET'])
@admin_required
def admin_list_user_templates():
    """
    GET /api/admin/user-templates - 获取所有用户的模板列表（管理员）
    Query params: limit, offset, user_id (可选，按用户筛选)
    """
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    user_id = request.args.get('user_id', None)

    query = UserTemplate.query.filter_by(is_preset=False)

    if user_id:
        query = query.filter_by(user_id=user_id)

    total = query.count()

    templates = query.order_by(
        UserTemplate.created_at.desc()
    ).offset(offset).limit(limit).all()

    return success_response({
        'templates': [t.to_dict(include_user=True) for t in templates],
        'total': total
    })


@admin_user_template_bp.route('/<template_id>', methods=['DELETE'])
@admin_required
def admin_delete_user_template(template_id):
    """
    DELETE /api/admin/user-templates/<id> - 删除用户模板（管理员）
    """
    try:
        template = UserTemplate.query.get(template_id)

        if not template:
            return not_found('Template')

        if template.is_preset:
            return bad_request("预设模板请通过预设模板管理接口删除")

        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        file_service.delete_user_template(template_id)

        db.session.delete(template)
        db.session.commit()

        return success_response({'message': '用户模板删除成功'})

    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@admin_user_template_bp.route('/<template_id>/copy-to-preset', methods=['POST'])
@admin_required
def admin_copy_user_template_to_preset(template_id):
    """
    POST /api/admin/user-templates/<id>/copy-to-preset - 复制用户模板为预设模板

    Request JSON: { "name": "预设模板名称" }
    """
    try:
        # 查找源模板
        source_template = UserTemplate.query.get(template_id)

        if not source_template:
            return not_found('Template')

        if source_template.is_preset:
            return bad_request("该模板已经是预设模板")

        # 获取名称参数
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        if not name:
            return bad_request("预设模板名称不能为空")

        import uuid
        import shutil
        import os

        new_template_id = str(uuid.uuid4())
        upload_folder = current_app.config['UPLOAD_FOLDER']

        # 复制文件
        source_dir = os.path.join(upload_folder, 'user-templates', template_id)
        target_dir = os.path.join(upload_folder, 'user-templates', new_template_id)

        if not os.path.exists(source_dir):
            return bad_request("源模板文件不存在")

        os.makedirs(target_dir, exist_ok=True)

        # 找到源文件并复制
        source_files = os.listdir(source_dir)
        if not source_files:
            return bad_request("源模板文件为空")

        source_file = source_files[0]
        ext = os.path.splitext(source_file)[1]
        new_filename = f"template{ext}"

        shutil.copy2(
            os.path.join(source_dir, source_file),
            os.path.join(target_dir, new_filename)
        )

        # 创建新的预设模板记录
        new_file_path = f"user-templates/{new_template_id}/{new_filename}"

        new_template = UserTemplate(
            id=new_template_id,
            user_id=None,  # 预设模板不绑定用户
            is_preset=True,
            name=name,
            file_path=new_file_path,
            file_size=source_template.file_size
        )
        db.session.add(new_template)
        db.session.commit()

        return success_response({
            'template': new_template.to_dict(),
            'message': '已成功复制为预设模板'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error copying user template to preset: {e}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)

