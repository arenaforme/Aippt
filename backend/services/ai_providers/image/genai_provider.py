"""
Google GenAI SDK implementation for image generation
"""
import logging
import os
from typing import Optional, List
import httpx
from google import genai
from google.genai import types
from PIL import Image
from .base import ImageProvider

logger = logging.getLogger(__name__)

# 在模块加载时设置 httpx 默认代理
_proxy_url = os.getenv('HTTPS_PROXY') or os.getenv('HTTP_PROXY') or os.getenv('https_proxy') or os.getenv('http_proxy')
if _proxy_url:
    logger.info(f"Setting default httpx proxy: {_proxy_url}")
    # 通过环境变量让 httpx 自动使用代理
    os.environ.setdefault('HTTP_PROXY', _proxy_url)
    os.environ.setdefault('HTTPS_PROXY', _proxy_url)
    os.environ.setdefault('http_proxy', _proxy_url)
    os.environ.setdefault('https_proxy', _proxy_url)


class GenAIImageProvider(ImageProvider):
    """Image generation using Google GenAI SDK"""
    
    def __init__(self, api_key: str, api_base: str = None, model: str = "gemini-3-pro-image-preview"):
        """
        Initialize GenAI image provider

        Args:
            api_key: Google API key
            api_base: API base URL (for proxies like aihubmix)
            model: Model name to use
        """
        # 配置 HTTP 选项
        # 注意：HttpOptions.timeout 单位是毫秒，5分钟 = 300000毫秒
        http_options = types.HttpOptions(
            base_url=api_base,
            timeout=300000,  # 5分钟超时（毫秒），图片生成需要较长时间
        ) if api_base else types.HttpOptions(timeout=300000)

        self.client = genai.Client(
            http_options=http_options,
            api_key=api_key
        )
        self.model = model
    
    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate image using Google GenAI SDK
        
        Args:
            prompt: The image generation prompt
            ref_images: Optional list of reference images
            aspect_ratio: Image aspect ratio
            resolution: Image resolution (supports "1K", "2K", "4K")
            
        Returns:
            Generated PIL Image object, or None if failed
        """
        try:
            # Build contents list with prompt and reference images
            contents = []
            
            # Add reference images first (if any)
            if ref_images:
                for ref_img in ref_images:
                    contents.append(ref_img)
            
            # Add text prompt
            contents.append(prompt)
            
            logger.debug(f"Calling GenAI API for image generation with {len(ref_images) if ref_images else 0} reference images...")
            logger.debug(f"Config - aspect_ratio: {aspect_ratio}, resolution: {resolution}")
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=['TEXT', 'IMAGE'],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                        image_size=resolution
                    ),
                )
            )
            
            logger.debug("GenAI API call completed")
            
            # Extract image from response
            for i, part in enumerate(response.parts):
                if part.text is not None:
                    logger.debug(f"Part {i}: TEXT - {part.text[:100] if len(part.text) > 100 else part.text}")
                else:
                    try:
                        logger.debug(f"Part {i}: Attempting to extract image...")
                        image = part.as_image()
                        if image:
                            logger.debug(f"Successfully extracted image from part {i}")
                            return image
                    except Exception as e:
                        logger.debug(f"Part {i}: Failed to extract image - {str(e)}")
            
            # No image found in response
            error_msg = "No image found in API response. "
            if response.parts:
                error_msg += f"Response had {len(response.parts)} parts but none contained valid images."
            else:
                error_msg += "Response had no parts."
            
            raise ValueError(error_msg)
            
        except Exception as e:
            error_detail = f"Error generating image with GenAI: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

