"""
Export Controller - handles file export endpoints
"""
from flask import Blueprint, request, current_app
from models import db, Project, Page, Task
from utils import error_response, not_found, bad_request, success_response
from utils.auth import login_required, feature_required
from services import ExportService, FileService
from services.task_manager import task_manager, export_editable_ppt_task
import os
import io
import uuid

export_bp = Blueprint('export', __name__, url_prefix='/api/projects')

import logging
logger = logging.getLogger(__name__)


def _build_reference_text_from_pages(pages) -> str:
    """
    从页面列表构建参考文本，用于 OCR 结果校正

    格式：
    ##第1页
    页面标题
    文本内容1
    文本内容2
    ...

    ##第2页
    ...
    """
    lines = []
    for page in pages:
        desc_content = page.get_description_content()
        if not desc_content:
            continue

        page_num = page.order_index + 1
        lines.append(f"##第{page_num}页")

        # 提取标题
        title = desc_content.get('title', '')
        if title:
            lines.append(title)

        # 提取文本内容
        text_content = desc_content.get('text_content', [])
        if isinstance(text_content, list):
            for text in text_content:
                if text:
                    lines.append(text)
        elif text_content:
            lines.append(str(text_content))

        # 注意：不再提取 'text' 字段，因为它是完整描述文本，
        # 包含了 title 和 text_content 的内容，会导致重复

        lines.append('')  # 空行分隔

    result = '\n'.join(lines)
    logger.info(f"构建参考文本完成，共 {len(pages)} 页，内容长度: {len(result)} 字符")
    if result:
        logger.debug(f"参考文本内容:\n{result[:500]}...")  # 只打印前500字符
    return result


@export_bp.route('/<project_id>/export/pptx', methods=['GET'])
@login_required
@feature_required('export_image_pptx', consume_quota=False)
def export_pptx(project_id):
    """
    GET /api/projects/{project_id}/export/pptx?filename=... - Export PPTX
    
    Returns:
        JSON with download URL, e.g.
        {
            "success": true,
            "data": {
                "download_url": "/files/{project_id}/exports/xxx.pptx",
                "download_url_absolute": "http://host:port/files/{project_id}/exports/xxx.pptx"
            }
        }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Get all completed pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # Get image paths
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        
        image_paths = []
        for page in pages:
            if page.generated_image_path:
                abs_path = file_service.get_absolute_path(page.generated_image_path)
                image_paths.append(abs_path)
        
        if not image_paths:
            return bad_request("No generated images found for project")
        
        # Determine export directory and filename
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        exports_dir = file_service._get_exports_dir(project_id)
        
        # Get filename from query params or use default
        filename = request.args.get('filename', f'presentation_{project_id}.pptx')
        if not filename.endswith('.pptx'):
            filename += '.pptx'

        output_path = os.path.join(exports_dir, filename)

        # Generate PPTX file on disk
        ExportService.create_pptx_from_images(image_paths, output_file=output_path)

        # Build download URLs
        download_path = f"/files/{project_id}/exports/{filename}"
        base_url = request.url_root.rstrip("/")
        download_url_absolute = f"{base_url}{download_path}"

        return success_response(
            data={
                "download_url": download_path,
                "download_url_absolute": download_url_absolute,
            },
            message="Export PPTX task created"
        )
    
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@export_bp.route('/<project_id>/export/pdf', methods=['GET'])
@login_required
@feature_required('export_pdf', consume_quota=False)
def export_pdf(project_id):
    """
    GET /api/projects/{project_id}/export/pdf?filename=... - Export PDF
    
    Returns:
        JSON with download URL, e.g.
        {
            "success": true,
            "data": {
                "download_url": "/files/{project_id}/exports/xxx.pdf",
                "download_url_absolute": "http://host:port/files/{project_id}/exports/xxx.pdf"
            }
        }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Get all completed pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # Get image paths
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        
        image_paths = []
        for page in pages:
            if page.generated_image_path:
                abs_path = file_service.get_absolute_path(page.generated_image_path)
                image_paths.append(abs_path)
        
        if not image_paths:
            return bad_request("No generated images found for project")
        
        # Determine export directory and filename
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        exports_dir = file_service._get_exports_dir(project_id)

        # Get filename from query params or use default
        filename = request.args.get('filename', f'presentation_{project_id}.pdf')
        if not filename.endswith('.pdf'):
            filename += '.pdf'

        output_path = os.path.join(exports_dir, filename)

        # Generate PDF file on disk
        ExportService.create_pdf_from_images(image_paths, output_file=output_path)

        # Build download URLs
        download_path = f"/files/{project_id}/exports/{filename}"
        base_url = request.url_root.rstrip("/")
        download_url_absolute = f"{base_url}{download_path}"

        return success_response(
            data={
                "download_url": download_path,
                "download_url_absolute": download_url_absolute,
            },
            message="Export PDF task created"
        )

    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@export_bp.route('/<project_id>/export/editable-pptx', methods=['POST'])
@login_required
@feature_required('export_editable_pptx', consume_quota=True)
def export_editable_pptx(project_id):
    """
    POST /api/projects/{project_id}/export/editable-pptx - 导出可编辑 PPT（异步）

    使用 OCR 识别图片中的文字，生成可编辑的 PPT 文件

    Request Body (optional):
        {
            "filename": "presentation.pptx"
        }

    Returns:
        JSON with task_id for polling, e.g.
        {
            "success": true,
            "data": {
                "task_id": "xxx",
                "message": "Export task started"
            }
        }
    """
    try:
        project = Project.query.get(project_id)

        if not project:
            return not_found('Project')

        # 检查百度 OCR 配置
        api_key = current_app.config.get('BAIDU_OCR_API_KEY')
        secret_key = current_app.config.get('BAIDU_OCR_SECRET_KEY')

        if not api_key or not secret_key:
            return bad_request(
                "百度 OCR 未配置，请在环境变量中设置 "
                "BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY"
            )

        # 获取所有已完成的页面
        pages = Page.query.filter_by(
            project_id=project_id
        ).order_by(Page.order_index).all()

        if not pages:
            return bad_request("No pages found for project")

        # 获取图片路径
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])

        image_paths = []
        for page in pages:
            if page.generated_image_path:
                abs_path = file_service.get_absolute_path(
                    page.generated_image_path
                )
                image_paths.append(abs_path)

        if not image_paths:
            return bad_request("No generated images found for project")

        # 构建参考文本（从页面描述中提取）
        reference_text = _build_reference_text_from_pages(pages)
        if reference_text:
            logger.info(f"已构建参考文本，将用于校正 OCR 结果")
        else:
            logger.warning(f"未能构建参考文本，页面可能没有描述内容")

        # 确定导出目录和文件名
        exports_dir = file_service._get_exports_dir(project_id)

        # 从请求体获取文件名
        data = request.get_json() or {}
        filename = data.get(
            'filename',
            f'editable_{project_id}.pptx'
        )
        if not filename.endswith('.pptx'):
            filename += '.pptx'

        output_path = os.path.join(exports_dir, filename)

        # 创建异步任务
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            project_id=project_id,
            task_type='EXPORT_EDITABLE_PPTX',
            status='PENDING'
        )
        db.session.add(task)
        db.session.commit()

        # 提交后台任务
        task_manager.submit_task(
            task_id,
            export_editable_ppt_task,
            project_id=project_id,
            image_paths=image_paths,
            output_path=output_path,
            api_key=api_key,
            secret_key=secret_key,
            reference_text=reference_text,
            app=current_app._get_current_object()
        )

        return success_response(
            data={
                "task_id": task_id,
                "message": "Export task started"
            },
            message="可编辑 PPT 导出任务已创建"
        )

    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@export_bp.route('/<project_id>/export/editable-pptx/<task_id>', methods=['GET'])
def get_editable_pptx_status(project_id, task_id):
    """
    GET /api/projects/{project_id}/export/editable-pptx/{task_id} - 获取导出任务状态

    Returns:
        JSON with task status and download URL when completed
    """
    try:
        task = Task.query.get(task_id)

        if not task or task.project_id != project_id:
            return not_found('Task')

        progress = task.get_progress() or {}

        response_data = {
            "task_id": task_id,
            "status": task.status,
            "progress": progress
        }

        if task.status == 'COMPLETED':
            output_path = progress.get('output_path', '')
            if output_path:
                filename = os.path.basename(output_path)
                download_path = f"/files/{project_id}/exports/{filename}"
                base_url = request.url_root.rstrip("/")
                response_data["download_url"] = download_path
                response_data["download_url_absolute"] = (
                    f"{base_url}{download_path}"
                )

        elif task.status == 'FAILED':
            response_data["error"] = task.error_message

        return success_response(data=response_data)

    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)

