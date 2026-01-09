"""
Grsai (grsai.dakka.com.cn) 自定义 SDK 图片生成 Provider
支持 nano-banana 系列模型，支持 1K/2K/4K 分辨率
"""
import logging
import base64
import httpx
from typing import Optional, List
from io import BytesIO
from PIL import Image
from .base import ImageProvider

logger = logging.getLogger(__name__)


class GrsaiImageProvider(ImageProvider):
    """Grsai 自定义 SDK 图片生成 Provider"""

    # 支持的模型列表
    SUPPORTED_MODELS = [
        "nano-banana-fast",
        "nano-banana",
        "nano-banana-pro",
        "nano-banana-pro-vt",
        "nano-banana-pro-cl",
        "nano-banana-pro-vip",
        "nano-banana-pro-4k-vip",
    ]

    def __init__(
        self,
        api_key: str,
        api_base: str,
        model: str = "nano-banana-pro"
    ):
        """
        初始化 Grsai 图片生成 Provider

        Args:
            api_key: API 密钥
            api_base: API 基础地址 (如 https://grsai.dakka.com.cn)
            model: 模型名称
        """
        self.api_key = api_key
        self.api_base = api_base.rstrip("/")
        self.model = model
        self.endpoint = "/v1/draw/nano-banana"
        self.timeout = 600.0  # 10 分钟超时

        logger.info(
            f"GrsaiImageProvider initialized - "
            f"api_base: {self.api_base}, model: {self.model}"
        )

    def _convert_images_to_base64_urls(
        self, images: Optional[List[Image.Image]]
    ) -> List[str]:
        """将 PIL Image 列表转换为 base64 URL 列表"""
        if not images:
            return []

        urls = []
        for img in images:
            # 转换为 RGB 模式（如果需要）
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            buffer = BytesIO()
            img.save(buffer, format="PNG")
            b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            urls.append(f"data:image/png;base64,{b64}")

        return urls

    def _download_image(self, url: str) -> Optional[Image.Image]:
        """从 URL 下载图片并转换为 PIL Image"""
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.get(url)
                response.raise_for_status()
                return Image.open(BytesIO(response.content))
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            return None

    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        使用 Grsai 自定义 SDK 生成图片

        Args:
            prompt: 图片生成提示词
            ref_images: 参考图片列表
            aspect_ratio: 图片比例 (16:9, 1:1, 4:3 等)
            resolution: 分辨率 (1K, 2K, 4K)

        Returns:
            生成的 PIL Image 对象，失败返回 None
        """
        try:
            # 构建请求 URL
            url = f"{self.api_base}{self.endpoint}"

            # 构建请求头
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }

            # 转换参考图片为 base64 URL
            image_urls = self._convert_images_to_base64_urls(ref_images)

            # 构建请求体
            payload = {
                "model": self.model,
                "prompt": prompt,
                "aspectRatio": aspect_ratio,
                "imageSize": resolution,
                "shutProgress": True,  # 关闭进度，直接返回最终结果
            }

            # 只有在有参考图片时才添加 urls 字段
            if image_urls:
                payload["urls"] = image_urls
                logger.info(f"📷 Adding {len(image_urls)} reference image(s)")

            logger.info(
                f"Calling Grsai API: {url}, "
                f"model: {self.model}, "
                f"aspectRatio: {aspect_ratio}, "
                f"imageSize: {resolution}"
            )

            # 发送请求（处理流式响应）
            with httpx.Client(timeout=self.timeout) as client:
                with client.stream(
                    "POST", url, json=payload, headers=headers
                ) as response:
                    if response.status_code != 200:
                        error_text = response.read().decode()[:500]
                        raise ValueError(
                            f"API returned status {response.status_code}: "
                            f"{error_text}"
                        )

                    # 读取流式响应，获取最终结果
                    result = self._parse_stream_response(response)

            # 检查响应状态
            if result.get("status") == "failed":
                failure_reason = result.get("failure_reason", "unknown")
                error_msg = result.get("error", "")
                raise ValueError(
                    f"Image generation failed: {failure_reason} - {error_msg}"
                )

            # 获取图片 URL
            results = result.get("results", [])
            if not results:
                raise ValueError("No results in API response")

            image_url = results[0].get("url")
            if not image_url:
                raise ValueError("No image URL in API response")

            logger.info(f"Image generated, downloading from: {image_url[:50]}...")

            # 下载图片
            image = self._download_image(image_url)
            if image:
                logger.info(
                    f"Successfully generated image with Grsai: "
                    f"{image.size[0]}x{image.size[1]}"
                )
            return image

        except Exception as e:
            error_detail = (
                f"Error generating image with Grsai: "
                f"{type(e).__name__}: {str(e)}"
            )
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

    def _parse_stream_response(self, response) -> dict:
        """
        解析流式响应，提取最终结果

        Grsai API 返回的流式响应格式（SSE 格式）：
        - 每行以 "data:" 开头，后跟 JSON 对象
        - 最后一个包含 status="succeeded" 的对象是最终结果

        Args:
            response: httpx 流式响应对象

        Returns:
            解析后的最终结果字典
        """
        import json

        last_result = {}
        buffer = ""
        raw_content = ""

        for chunk in response.iter_text():
            buffer += chunk
            raw_content += chunk

        # 记录原始响应内容（用于调试）
        logger.info(f"Raw stream response length: {len(raw_content)} chars")
        logger.debug(f"Raw stream response (first 500 chars): {raw_content[:500]}")

        # 按行解析
        lines = buffer.split("\n")
        for line in lines:
            line = line.strip()

            if not line:
                continue

            # 处理 SSE 格式：移除 "data:" 前缀
            if line.startswith("data:"):
                line = line[5:].strip()

            # 跳过 SSE 事件类型行
            if line.startswith("event:") or line.startswith("id:"):
                continue

            try:
                data = json.loads(line)
                # 保存每个有效的 JSON 对象
                if isinstance(data, dict):
                    last_result = data
                    # 记录进度
                    progress = data.get("progress", 0)
                    status = data.get("status", "")
                    logger.info(f"Parsed JSON - progress: {progress}%, status: {status}")
            except json.JSONDecodeError:
                # 记录无法解析的行
                if len(line) > 0:
                    logger.debug(f"Skipping non-JSON line: {line[:100]}")
                continue

        if not last_result:
            # 尝试将整个响应作为单个 JSON 解析
            try:
                data = json.loads(raw_content.strip())
                if isinstance(data, dict):
                    last_result = data
                    logger.info("Parsed entire response as single JSON")
            except json.JSONDecodeError:
                logger.error(f"Failed to parse response. Raw content: {raw_content[:1000]}")
                raise ValueError("No valid JSON response received from stream")

        logger.info(
            f"Stream parsing complete - status: {last_result.get('status')}, "
            f"progress: {last_result.get('progress')}%"
        )

        return last_result
