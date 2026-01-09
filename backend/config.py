"""
Backend configuration file
"""
import os
import sys
from datetime import timedelta

# 基础配置 - 使用更可靠的路径计算方式
# 在模块加载时立即计算并固定路径
_current_file = os.path.realpath(__file__)  # 使用realpath解析所有符号链接
BASE_DIR = os.path.dirname(_current_file)
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# Flask配置
class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    
    # 数据库配置
    # Use absolute path to avoid WSL path issues
    db_path = os.path.join(BASE_DIR, 'instance', 'database.db')
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL', 
        f'sqlite:///{db_path}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # SQLite线程安全配置 - 关键修复
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {
            'check_same_thread': False,  # 允许跨线程使用（仅SQLite）
            'timeout': 30  # 增加超时时间
        },
        'pool_pre_ping': True,  # 连接前检查
        'pool_recycle': 3600,  # 1小时回收连接
    }
    
    # 文件存储配置
    UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
    MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ALLOWED_REFERENCE_FILE_EXTENSIONS = {'pdf', 'docx', 'pptx', 'doc', 'ppt', 'xlsx', 'xls', 'csv', 'txt', 'md'}
    
    # AI服务配置
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    GOOGLE_API_BASE = os.getenv('GOOGLE_API_BASE', '')
    
    # AI Provider 格式配置: "gemini" (Google GenAI SDK) 或 "openai" (OpenAI SDK)
    AI_PROVIDER_FORMAT = os.getenv('AI_PROVIDER_FORMAT', 'gemini')
    
    # OpenAI 格式专用配置（当 AI_PROVIDER_FORMAT=openai 时使用）
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')  # 当 AI_PROVIDER_FORMAT=openai 时必须设置
    OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'https://aihubmix.com/v1')
    OPENAI_TIMEOUT = float(os.getenv('OPENAI_TIMEOUT', '60.0'))
    OPENAI_MAX_RETRIES = int(os.getenv('OPENAI_MAX_RETRIES', '3'))
    
    # AI 模型配置
    TEXT_MODEL = os.getenv('TEXT_MODEL', 'gemini-3-flash-preview')
    IMAGE_MODEL = os.getenv('IMAGE_MODEL', 'gemini-3-pro-image-preview')

    # Docling 文件解析服务配置
    DOCLING_API_BASE = os.getenv('DOCLING_API_BASE', 'http://127.0.0.1:5004')
    # 文件解析大小限制（字节），默认 50MB
    FILE_PARSE_MAX_SIZE = int(os.getenv('FILE_PARSE_MAX_SIZE', str(50 * 1024 * 1024)))

    # 百度 OCR 配置（用于可编辑 PPT 导出）
    BAIDU_OCR_API_KEY = os.getenv('BAIDU_OCR_API_KEY', '')
    BAIDU_OCR_SECRET_KEY = os.getenv('BAIDU_OCR_SECRET_KEY', '')
    
    # 图片识别模型配置
    IMAGE_CAPTION_MODEL = os.getenv('IMAGE_CAPTION_MODEL', 'gemini-3-flash-preview')
    
    # 并发配置
    MAX_DESCRIPTION_WORKERS = int(os.getenv('MAX_DESCRIPTION_WORKERS', '5'))
    MAX_IMAGE_WORKERS = int(os.getenv('MAX_IMAGE_WORKERS', '8'))
    
    # 图片生成配置
    DEFAULT_ASPECT_RATIO = "16:9"
    DEFAULT_RESOLUTION = "2K"
    
    # 日志配置
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # CORS配置
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # 输出语言配置
    # 可选值: 'zh' (中文), 'ja' (日本語), 'en' (English), 'auto' (自动)
    OUTPUT_LANGUAGE = os.getenv('OUTPUT_LANGUAGE', 'zh')

    # 微信支付配置
    WECHAT_APP_ID = os.getenv('WECHAT_APP_ID', '')
    WECHAT_MCH_ID = os.getenv('WECHAT_MCH_ID', '')  # 商户号
    WECHAT_API_KEY = os.getenv('WECHAT_API_KEY', '')  # API密钥
    WECHAT_CERT_PATH = os.getenv('WECHAT_CERT_PATH', '')  # 证书路径
    WECHAT_KEY_PATH = os.getenv('WECHAT_KEY_PATH', '')  # 私钥路径
    WECHAT_NOTIFY_URL = os.getenv('WECHAT_NOTIFY_URL', '')  # 支付回调URL

    # 支付宝配置
    ALIPAY_APP_ID = os.getenv('ALIPAY_APP_ID', '')
    ALIPAY_PRIVATE_KEY = os.getenv('ALIPAY_PRIVATE_KEY', '')  # 应用私钥
    ALIPAY_PUBLIC_KEY = os.getenv('ALIPAY_PUBLIC_KEY', '')  # 支付宝公钥
    ALIPAY_NOTIFY_URL = os.getenv('ALIPAY_NOTIFY_URL', '')  # 支付回调URL
    ALIPAY_SANDBOX = os.getenv('ALIPAY_SANDBOX', 'false').lower() == 'true'  # 沙箱模式

    # CBB 聚合支付配置
    CBB_GATEWAY_URL = os.getenv('CBB_GATEWAY_URL', 'https://api.webtrn.cn')
    CBB_CLIENT_ID = os.getenv('CBB_CLIENT_ID', '')
    CBB_CLIENT_SECRET = os.getenv('CBB_CLIENT_SECRET', '')
    CBB_CUSTOMER_CODE = os.getenv('CBB_CUSTOMER_CODE', '')
    CBB_PRIVATE_KEY = os.getenv('CBB_PRIVATE_KEY', '')  # RSA私钥（Base64编码）
    CBB_PUBLIC_KEY = os.getenv('CBB_PUBLIC_KEY', '')  # RSA公钥（Base64编码）

    # CBB 短信服务配置
    SMS_SIGN_NAME = os.getenv('SMS_SIGN_NAME', 'AI演示眼')  # 短信签名
    SMS_TEMPLATE_CODE = os.getenv('SMS_TEMPLATE_CODE', 'SMS_500770214')  # 短信模板代码


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


# 根据环境变量选择配置
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('FLASK_ENV', 'development')
    return config_map.get(env, DevelopmentConfig)
