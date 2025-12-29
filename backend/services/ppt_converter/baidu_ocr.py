"""
百度云 OCR API 客户端
使用通用文字识别（高精度含位置版）
"""

import base64
import io
import re
import logging
from pathlib import Path
from typing import Union, Optional
import requests
from PIL import Image

from .models import TextBlock

logger = logging.getLogger(__name__)


# 纯符号正则（用于过滤误识别）
SYMBOL_ONLY_PATTERN = re.compile(
    r'^[\s\.\,\;\:\!\?\-\_\=\+\*\/\\\|\@\#\$\%\^\&\(\)\[\]\{\}\<\>\~\`\'\"\''
    r'●○◆◇■□▲△▼▽★☆→←↑↓↔↕♠♣♥♦•·…—–]+$'
)


def _is_valid_text(text: str, confidence: float) -> bool:
    """验证识别结果是否为有效文字"""
    if not text or not text.strip():
        return False

    text = text.strip()

    if SYMBOL_ONLY_PATTERN.match(text):
        return False

    # 单个字符：汉字需要较低置信度即可，其他字符过滤
    if len(text) == 1:
        if '\u4e00' <= text <= '\u9fff':
            return confidence >= 0.5  # 降低单字阈值，避免漏识别
        return False

    # 两个字符需要稍高置信度
    if len(text) == 2:
        return confidence >= 0.5

    return True


class BaiduOCRClient:
    """百度 OCR API 客户端"""

    TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token"
    # 使用通用文字识别（含位置信息版）
    OCR_URL = "https://aip.baidubce.com/rest/2.0/ocr/v1/general"

    def __init__(self, api_key: str, secret_key: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self._access_token: Optional[str] = None

    @property
    def access_token(self) -> str:
        """获取或刷新 access_token"""
        if self._access_token is None:
            self._access_token = self._get_access_token()
        return self._access_token

    def _get_access_token(self) -> str:
        """从百度 API 获取 access_token"""
        params = {
            "grant_type": "client_credentials",
            "client_id": self.api_key,
            "client_secret": self.secret_key
        }

        response = requests.post(self.TOKEN_URL, params=params, timeout=10)
        response.raise_for_status()

        result = response.json()
        if "access_token" not in result:
            raise ValueError(f"获取 access_token 失败: {result}")

        return result["access_token"]

    def _prepare_image(self, image_path: Path) -> tuple[str, float]:
        """
        准备图片用于 OCR，确保满足百度 OCR 限制

        百度 OCR 限制：
        - 图片最长边不超过 4096px
        - Base64 编码后不超过 4MB

        Returns:
            (base64_data, scale_factor): base64 编码的图片数据和缩放比例
        """
        MAX_DIMENSION = 4096
        MAX_BASE64_SIZE = 4 * 1024 * 1024  # 4MB

        with Image.open(image_path) as img:
            original_width, original_height = img.size
            scale_factor = 1.0

            # 检查是否需要缩放
            max_side = max(original_width, original_height)
            if max_side > MAX_DIMENSION:
                scale_factor = MAX_DIMENSION / max_side
                new_width = int(original_width * scale_factor)
                new_height = int(original_height * scale_factor)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.info(
                    f"图片缩放: {original_width}x{original_height} -> "
                    f"{new_width}x{new_height} (scale={scale_factor:.3f})"
                )

            # 转换为 JPEG 并编码为 base64
            buffer = io.BytesIO()
            # 转换为 RGB（去除 alpha 通道）
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()

            # 检查大小，如果超过限制则进一步压缩
            quality = 85
            while len(image_bytes) > MAX_BASE64_SIZE and quality > 30:
                quality -= 10
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=quality)
                image_bytes = buffer.getvalue()
                logger.info(f"图片压缩: quality={quality}, size={len(image_bytes)}")

            return base64.b64encode(image_bytes).decode("utf-8"), scale_factor

    def recognize(
        self,
        image_path: Union[str, Path],
        confidence_threshold: float = 0.6
    ) -> list[TextBlock]:
        """识别图片中的文字"""
        image_path = Path(image_path)

        # 压缩图片以满足百度 OCR 限制（最长边 4096px，base64 后 4MB）
        image_data, scale_factor = self._prepare_image(image_path)

        url = f"{self.OCR_URL}?access_token={self.access_token}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "image": image_data,
            "recognize_granularity": "small",
            "probability": "true"
        }

        response = requests.post(
            url, headers=headers, data=data, timeout=30
        )
        response.raise_for_status()

        result = response.json()

        if "error_code" in result:
            raise ValueError(
                f"百度 OCR 错误 {result['error_code']}: "
                f"{result.get('error_msg', '未知错误')}"
            )

        text_blocks = []
        words_result = result.get("words_result", [])

        # 调试日志：输出原始 OCR 结果
        logger.info(f"OCR 原始结果数量: {len(words_result)}")
        for i, item in enumerate(words_result):
            raw_text = item.get("words", "")
            raw_prob = item.get("probability", {}).get("average", 0)
            logger.info(f"  [{i}] 文字: '{raw_text}', 置信度: {raw_prob:.3f}")

        for item in words_result:
            text = item.get("words", "")
            location = item.get("location", {})
            prob = item.get("probability", {})

            # 调试日志：输出位置信息
            logger.info(f"  位置信息: {location}")

            confidence = prob.get("average", 0.9)

            if confidence < confidence_threshold:
                continue

            if not _is_valid_text(text, confidence):
                continue

            # 还原坐标（如果图片被压缩过）
            bbox = (
                int(location.get("left", 0) / scale_factor),
                int(location.get("top", 0) / scale_factor),
                int(location.get("width", 0) / scale_factor),
                int(location.get("height", 0) / scale_factor)
            )

            text_block = TextBlock(
                text=text,
                bbox=bbox,
                confidence=confidence
            )
            text_blocks.append(text_block)

        return text_blocks
