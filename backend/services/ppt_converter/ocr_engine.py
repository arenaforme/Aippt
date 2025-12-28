"""
OCR 识别模块
支持百度云 OCR（推荐）
"""

from pathlib import Path
from typing import Union, Optional
import os

from .models import TextBlock


class OCREngine:
    """OCR 识别引擎"""

    def __init__(
        self,
        engine: str = "baidu",
        api_key: str = None,
        secret_key: str = None,
        languages: list[str] = None,
    ):
        """
        初始化 OCR 引擎

        Args:
            engine: OCR 引擎类型 ("baidu")
            api_key: 百度 API Key
            secret_key: 百度 Secret Key
            languages: 识别语言列表（预留）
        """
        self.engine_type = engine
        self.languages = languages or ["ch_sim", "en"]

        # 百度 OCR 配置：优先使用参数，其次环境变量
        self.api_key = api_key or os.environ.get("BAIDU_OCR_API_KEY")
        self.secret_key = secret_key or os.environ.get("BAIDU_OCR_SECRET_KEY")

        self._baidu_client = None

    @property
    def baidu_client(self):
        """延迟加载百度 OCR 客户端"""
        if self._baidu_client is None:
            if not self.api_key or not self.secret_key:
                raise ValueError(
                    "使用百度 OCR 需要设置 API Key 和 Secret Key。\n"
                    "请在 .env 中配置：\n"
                    "  BAIDU_OCR_API_KEY=your_api_key\n"
                    "  BAIDU_OCR_SECRET_KEY=your_secret_key"
                )
            from .baidu_ocr import BaiduOCRClient
            self._baidu_client = BaiduOCRClient(
                self.api_key, self.secret_key
            )
        return self._baidu_client

    def recognize(
        self,
        image_path: Union[str, Path],
        confidence_threshold: float = 0.3
    ) -> list[TextBlock]:
        """识别图片中的文字"""
        return self.baidu_client.recognize(image_path, confidence_threshold)
