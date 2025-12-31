"""
PDF 转换控制器 - 处理 PDF 转 PPTX 的 API 端点
"""
import os
import uuid
import tempfile
from flask import Blueprint, request, current_app
from werkzeug.utils import secure_filename

from models import db, Task
from utils import error_response, bad_request, success_response
from utils.auth import login_required, feature_required
from services.pdf_converter import PDFConverter
from services.task_manager import task_manager
from services import FileService

pdf_convert_bp = Blueprint('pdf_convert', __name__, url_prefix='/api/tools')


def _allowed_file(filename: str) -> bool:
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'


def _pdf_to_pptx_task(
    task_id: str,
    pdf_path: str,
    output_path: str,
    app
):
    """PDF 转 PPTX 后台任务"""
    with app.app_context():
        task = Task.query.get(task_id)
        if not task:
            return

        try:
            task.status = 'PROCESSING'
            db.session.commit()

            def progress_callback(progress: dict):
                """更新任务进度"""
                task.set_progress(progress)
                db.session.commit()

            # 获取百度 OCR 凭证（用于图片型 PDF）
            baidu_api_key = app.config.get('BAIDU_OCR_API_KEY')
            baidu_secret_key = app.config.get('BAIDU_OCR_SECRET_KEY')

            converter = PDFConverter(
                baidu_api_key=baidu_api_key,
                baidu_secret_key=baidu_secret_key
            )
            result = converter.convert(
                pdf_path=pdf_path,
                output_path=output_path,
                progress_callback=progress_callback
            )

            if result.success:
                task.status = 'COMPLETED'
                task.set_progress({
                    'output_path': str(result.output_path),
                    'pages_count': result.pages_count,
                    'text_blocks_count': result.text_blocks_count,
                    'images_count': result.images_count
                })
            else:
                task.status = 'FAILED'
                task.error_message = result.error_message

            db.session.commit()

        except Exception as e:
            task.status = 'FAILED'
            task.error_message = str(e)
            db.session.commit()

        finally:
            # 清理临时 PDF 文件
            if os.path.exists(pdf_path):
                try:
                    os.remove(pdf_path)
                except Exception:
                    pass


@pdf_convert_bp.route('/pdf-to-pptx', methods=['POST'])
@login_required
@feature_required('pdf_to_pptx', consume_quota=True)
def convert_pdf_to_pptx():
    """
    POST /api/tools/pdf-to-pptx - 将 PDF 转换为可编辑 PPTX（异步）

    Request:
        multipart/form-data:
            - file: PDF 文件
            - filename: 输出文件名（可选）

    Returns:
        JSON with task_id for polling
    """
    # 检查文件
    if 'file' not in request.files:
        return bad_request("未上传文件")

    file = request.files['file']
    if file.filename == '':
        return bad_request("未选择文件")

    if not _allowed_file(file.filename):
        return bad_request("仅支持 PDF 文件")

    try:
        # 保存上传的 PDF 到临时目录
        temp_dir = tempfile.mkdtemp()
        pdf_filename = secure_filename(file.filename)
        pdf_path = os.path.join(temp_dir, pdf_filename)
        file.save(pdf_path)

        # 确定输出路径
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        exports_dir = file_service._get_tools_exports_dir()

        # 输出文件名
        output_filename = request.form.get('filename', '')
        if not output_filename:
            base_name = os.path.splitext(pdf_filename)[0]
            output_filename = f"{base_name}.pptx"
        if not output_filename.endswith('.pptx'):
            output_filename += '.pptx'

        output_path = os.path.join(exports_dir, output_filename)

        # 创建异步任务
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            project_id=None,  # 独立工具，不关联项目
            task_type='PDF_TO_PPTX',
            status='PENDING'
        )
        db.session.add(task)
        db.session.commit()

        # 提交后台任务
        task_manager.submit_task(
            task_id,
            _pdf_to_pptx_task,
            pdf_path=pdf_path,
            output_path=output_path,
            app=current_app._get_current_object()
        )

        return success_response(
            data={
                "task_id": task_id,
                "message": "转换任务已创建"
            },
            message="PDF 转 PPTX 任务已开始"
        )

    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@pdf_convert_bp.route('/pdf-to-pptx/<task_id>', methods=['GET'])
def get_pdf_convert_status(task_id: str):
    """
    GET /api/tools/pdf-to-pptx/{task_id} - 获取转换任务状态

    Returns:
        JSON with task status and download URL when completed
    """
    try:
        task = Task.query.get(task_id)

        if not task:
            return error_response('TASK_NOT_FOUND', '任务不存在', 404)

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
                download_path = f"/files/tools/exports/{filename}"
                base_url = request.url_root.rstrip("/")
                response_data["download_url"] = download_path
                response_data["download_url_absolute"] = f"{base_url}{download_path}"

        elif task.status == 'FAILED':
            response_data["error"] = task.error_message

        return success_response(data=response_data)

    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)

