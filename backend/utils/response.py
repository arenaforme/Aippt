"""
Unified response format utilities
"""
from flask import jsonify
from typing import Any, Dict, Optional


def success_response(data: Any = None, message: str = "Success", status_code: int = 200):
    """
    Generate a successful response
    
    Args:
        data: Response data
        message: Success message
        status_code: HTTP status code
    
    Returns:
        Flask response with JSON format
    """
    response = {
        "success": True,
        "message": message
    }
    
    if data is not None:
        response["data"] = data
    
    return jsonify(response), status_code


def error_response(error_code_or_message: str, message_or_status: any = None, status_code: int = None):
    """
    Generate an error response

    支持两种调用方式：
    1. error_response('ERROR_CODE', 'message', status_code)  # 三参数
    2. error_response('message', status_code)  # 两参数（向后兼容）

    Args:
        error_code_or_message: Error code (三参数) 或 Error message (两参数)
        message_or_status: Error message (三参数) 或 HTTP status code (两参数)
        status_code: HTTP status code (仅三参数时使用)

    Returns:
        Flask response with JSON format
    """
    # 判断调用方式：如果第二个参数是整数，则为两参数调用
    if isinstance(message_or_status, int):
        # 两参数调用：error_response('message', status_code)
        message = error_code_or_message
        actual_status_code = message_or_status
        error_code = 'ERROR'  # 默认错误码
    else:
        # 三参数调用：error_response('ERROR_CODE', 'message', status_code)
        error_code = error_code_or_message
        message = message_or_status if message_or_status else ''
        actual_status_code = status_code if status_code else 400

    return jsonify({
        "success": False,
        "error": {
            "code": error_code,
            "message": message
        }
    }), actual_status_code


# Common error responses
def bad_request(message: str = "Invalid request"):
    return error_response("INVALID_REQUEST", message, 400)


def not_found(resource: str = "Resource"):
    return error_response(f"{resource.upper()}_NOT_FOUND", f"{resource} not found", 404)


def invalid_status(message: str = "Invalid status for this operation"):
    return error_response("INVALID_PROJECT_STATUS", message, 400)


def ai_service_error(message: str = "AI service error"):
    return error_response("AI_SERVICE_ERROR", message, 503)


def rate_limit_error(message: str = "Rate limit exceeded"):
    return error_response("RATE_LIMIT_EXCEEDED", message, 429)

