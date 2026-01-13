"""
Google GenAI implementation for image generation
Supports both SDK mode (for Google official API) and HTTP mode (for third-party APIs)
"""
import logging
import base64
from typing import Optional, List
from io import BytesIO
import httpx
from google import genai
from google.genai import types
from PIL import Image
from .base import ImageProvider

logger = logging.getLogger(__name__)


class GenAIImageProvider(ImageProvider):
    """Image generation supporting both Google SDK and HTTP direct calls"""

    def __init__(self, api_key: str, api_base: str = None, model: str = "gemini-3-pro-image-preview"):
        """
        Initialize GenAI image provider

        Args:
            api_key: Google API key
            api_base: API base URL (for proxies)
            model: Model name to use
        """
        self.api_key = api_key
        self.api_base = api_base
        self.model = model
        self.timeout = 600.0  # 10 minutes

        # 判断是否使用 Google 官方 API
        self._use_sdk = self._is_google_official_api()

        if self._use_sdk:
            # 使用 Google SDK
            http_options = types.HttpOptions(
                base_url=api_base,
                timeout=300000,  # 5分钟超时（毫秒）
            ) if api_base else types.HttpOptions(timeout=300000)

            self.client = genai.Client(
                http_options=http_options,
                api_key=api_key
            )
            logger.info(f"GenAI Image Provider initialized with SDK mode")
        else:
            logger.info(f"GenAI Image Provider initialized with HTTP mode, api_base: {api_base}")

    def _is_google_official_api(self) -> bool:
        """判断是否使用 Google 官方 API"""
        if not self.api_base:
            return True
        return "googleapis.com" in self.api_base


    def _compress_image(self, img: Image.Image, max_size: int = 1024) -> Image.Image:
        """
        压缩图片以减少网络传输数据量
        
        Args:
            img: PIL Image 对象
            max_size: 最大边长（像素），默认 1024
        
        Returns:
            压缩后的 PIL Image 对象
        """
        width, height = img.size
        
        # 如果图片已经足够小，直接返回
        if max(width, height) <= max_size:
            return img
        
        # 计算缩放比例，保持宽高比
        ratio = max_size / max(width, height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        
        # 使用高质量重采样算法缩放
        compressed = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        logger.info(f"图片压缩: {width}x{height} -> {new_width}x{new_height}")
        
        return compressed

    def _image_to_base64(self, img: Image.Image) -> str:
        """Convert PIL Image to base64 string with compression"""
        # 先压缩图片
        compressed = self._compress_image(img)
        
        # 处理透明通道（JPEG 不支持透明）
        if compressed.mode in ('RGBA', 'LA', 'P'):
            compressed = compressed.convert('RGB')
        
        # 使用 JPEG 格式，比 PNG 小很多
        buffer = BytesIO()
        compressed.save(buffer, format="JPEG", quality=85, optimize=True)
        
        # 记录压缩效果
        size_kb = len(buffer.getvalue()) / 1024
        logger.info(f"图片 base64 大小: {size_kb:.1f}KB")
        
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate image using SDK or HTTP based on configuration

        Args:
            prompt: The image generation prompt
            ref_images: Optional list of reference images
            aspect_ratio: Image aspect ratio
            resolution: Image resolution (supports "1K", "2K", "4K")

        Returns:
            Generated PIL Image object, or None if failed
        """
        if self._use_sdk:
            return self._generate_with_sdk(prompt, ref_images, aspect_ratio, resolution)
        else:
            return self._generate_with_http(prompt, ref_images, aspect_ratio, resolution)

    def _generate_with_sdk(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]],
        aspect_ratio: str,
        resolution: str
    ) -> Optional[Image.Image]:
        """使用 Google SDK 生成图片"""
        try:
            # 构建内容列表
            contents = []

            # 添加参考图片（如果有）
            if ref_images:
                logger.info(f"📷 Adding {len(ref_images)} reference image(s) to SDK request")
                for i, ref_img in enumerate(ref_images):
                    logger.info(f"  - Ref image {i+1}: size={ref_img.size}, mode={ref_img.mode}")
                    contents.append(ref_img)
            else:
                logger.warning("⚠️ No reference images provided to generate_image")

            # 添加文本提示
            contents.append(prompt)

            # 调用 SDK
            logger.info(f"SDK config - aspect_ratio: {aspect_ratio}, resolution: {resolution}")
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                        image_size=resolution,
                    ),
                ),
            )

            # 从响应中提取图片
            # 注意：SDK 返回的 inline_data.data 可能是 bytes（原始二进制）或 str（base64 编码）
            images = []
            for part in response.candidates[0].content.parts:
                if part.inline_data is not None:
                    data = part.inline_data.data
                    if isinstance(data, str):
                        img_data = base64.b64decode(data)
                    elif isinstance(data, bytes):
                        img_data = data
                    else:
                        logger.warning(f"Unexpected inline_data.data type: {type(data)}")
                        continue
                    img = Image.open(BytesIO(img_data))
                    images.append((img, img.size[0] * img.size[1]))
                    logger.debug(f"SDK response: IMAGE - {img.size[0]}x{img.size[1]}")

            if not images:
                raise ValueError("No valid images found in SDK response")

            # 返回最大的图片
            images.sort(key=lambda x: x[1], reverse=True)
            logger.info(f"Successfully generated image with SDK: {images[0][0].size[0]}x{images[0][0].size[1]}")
            return images[0][0]

        except Exception as e:
            error_detail = f"Error generating image with GenAI SDK: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

    def _generate_with_http(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]],
        aspect_ratio: str,
        resolution: str
    ) -> Optional[Image.Image]:
        """使用 HTTP 直接请求生成图片（用于第三方 API）"""
        try:
            # 构建 parts 列表
            parts = []

            # 添加参考图片（如果有）
            if ref_images:
                logger.info(f"📷 Adding {len(ref_images)} reference image(s) to HTTP request")
                for i, ref_img in enumerate(ref_images):
                    logger.info(f"  - Ref image {i+1}: size={ref_img.size}, mode={ref_img.mode}")
                    parts.append({
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": self._image_to_base64(ref_img)
                        }
                    })
            else:
                logger.warning("⚠️ No reference images provided to generate_image")

            # 添加文本提示
            parts.append({"text": prompt})

            # 构建请求 payload
            payload = {
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {
                    "maxOutputTokens": 4096,
                    "response_modalities": ["TEXT", "IMAGE"],
                    "image_config": {
                        "aspect_ratio": aspect_ratio,
                        "image_size": resolution
                    }
                }
            }

            # 第三方 API 使用 Bearer token
            api_base = self.api_base or "https://generativelanguage.googleapis.com"
            url = f"{api_base}/v1beta/models/{self.model}:generateContent"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }

            logger.info(f"Calling GenAI API (HTTP): {url}")
            logger.debug(f"Config - aspect_ratio: {aspect_ratio}, resolution: {resolution}")

            # 发送 HTTP 请求
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload, headers=headers)

            logger.debug(f"HTTP Status: {response.status_code}")

            if response.status_code != 200:
                error_text = response.text[:500]
                raise ValueError(f"API returned status {response.status_code}: {error_text}")

            # 解析响应
            data = response.json()

            # 调试：记录完整响应结构
            logger.info(f"API Response keys: {data.keys()}")

            # 兼容第三方 API 的包装格式 {"code": ..., "data": ..., "msg": ...}
            if "code" in data and "data" in data:
                logger.info(f"Third-party API format detected - code: {data.get('code')}, msg: {data.get('msg')}")
                if data.get("code") != 0:
                    raise ValueError(f"Third-party API error: code={data.get('code')}, msg={data.get('msg')}")
                # 从 data 字段中提取实际内容
                actual_data = data.get("data", {})
                logger.info(f"Actual data keys: {actual_data.keys() if isinstance(actual_data, dict) else type(actual_data)}")
                candidates = actual_data.get("candidates", []) if isinstance(actual_data, dict) else []
            else:
                # Google 原生格式
                if "candidates" in data:
                    logger.info(f"Google format - Candidates count: {len(data['candidates'])}")
                candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("API response has no candidates")

            content = candidates[0].get("content", {})
            response_parts = content.get("parts", [])

            if not response_parts:
                raise ValueError("API response has no parts")

            # 查找并返回最大的图片
            images = []
            for i, part in enumerate(response_parts):
                if "text" in part:
                    text_preview = part['text'][:100] if len(part['text']) > 100 else part['text']
                    logger.debug(f"Part {i}: TEXT - {text_preview}")
                elif "inlineData" in part:
                    try:
                        img_data = base64.b64decode(part["inlineData"]["data"])
                        img = Image.open(BytesIO(img_data))
                        images.append((img, img.size[0] * img.size[1]))
                        logger.debug(f"Part {i}: IMAGE - {img.size[0]}x{img.size[1]}")
                    except Exception as e:
                        logger.warning(f"Part {i}: Failed to decode image - {str(e)}")

            if not images:
                raise ValueError("No valid images found in API response")

            # 返回最大的图片
            images.sort(key=lambda x: x[1], reverse=True)
            logger.info(f"Successfully generated image with HTTP: {images[0][0].size[0]}x{images[0][0].size[1]}")
            return images[0][0]

        except Exception as e:
            error_detail = f"Error generating image with GenAI HTTP: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e