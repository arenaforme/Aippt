"""
Google GenAI HTTP implementation for image generation
Bypasses SDK to handle third-party API compatibility issues
"""
import logging
import os
import base64
from typing import Optional, List
from io import BytesIO
import httpx
from PIL import Image
from .base import ImageProvider

logger = logging.getLogger(__name__)


class GenAIImageProvider(ImageProvider):
    """Image generation using direct HTTP calls to Gemini API"""

    def __init__(self, api_key: str, api_base: str = None, model: str = "gemini-3-pro-image-preview"):
        """
        Initialize GenAI image provider

        Args:
            api_key: Google API key
            api_base: API base URL (for proxies)
            model: Model name to use
        """
        self.api_key = api_key
        self.api_base = api_base or "https://generativelanguage.googleapis.com"
        self.model = model
        self.timeout = 600.0  # 10 minutes

    def _image_to_base64(self, img: Image.Image) -> str:
        """Convert PIL Image to base64 string"""
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def generate_image(
        self,
        prompt: str,
        ref_images: Optional[List[Image.Image]] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "2K"
    ) -> Optional[Image.Image]:
        """
        Generate image using direct HTTP API call

        Args:
            prompt: The image generation prompt
            ref_images: Optional list of reference images
            aspect_ratio: Image aspect ratio
            resolution: Image resolution (supports "1K", "2K", "4K")

        Returns:
            Generated PIL Image object, or None if failed
        """
        try:
            # Build parts list
            parts = []

            # Add reference images first (if any)
            if ref_images:
                logger.info(f"📷 Adding {len(ref_images)} reference image(s) to request")
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

            # Add text prompt
            parts.append({"text": prompt})

            # Build request payload
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

            # Build URL and headers based on API provider
            # Google official API uses API key as query param, third-party uses Bearer token
            if "googleapis.com" in self.api_base:
                # Google official API
                url = f"{self.api_base}/v1beta/models/{self.model}:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
            else:
                # Third-party API (OpenAI-style Bearer token)
                url = f"{self.api_base}/v1beta/models/{self.model}:generateContent"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }

            logger.info(f"Calling GenAI API: {url.split('?')[0]}")  # Hide API key in logs
            logger.debug(f"Config - aspect_ratio: {aspect_ratio}, resolution: {resolution}")

            # Make HTTP request
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload, headers=headers)

            logger.debug(f"HTTP Status: {response.status_code}")

            if response.status_code != 200:
                error_text = response.text[:500]
                raise ValueError(f"API returned status {response.status_code}: {error_text}")

            # Parse response
            data = response.json()

            # Debug: log response structure
            logger.info(f"API Response keys: {data.keys()}")
            if "candidates" in data:
                logger.info(f"Candidates count: {len(data['candidates'])}")
                if data['candidates']:
                    content = data['candidates'][0].get('content', {})
                    parts = content.get('parts', [])
                    logger.info(f"Parts count: {len(parts)}")
                    for i, p in enumerate(parts):
                        logger.info(f"Part {i} keys: {p.keys()}")

            # Extract image from response
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("API response has no candidates")

            content = candidates[0].get("content", {})
            response_parts = content.get("parts", [])

            if not response_parts:
                raise ValueError("API response has no parts")

            # Find and return the largest image
            images = []
            for i, part in enumerate(response_parts):
                if "text" in part:
                    logger.debug(f"Part {i}: TEXT - {part['text'][:100] if len(part['text']) > 100 else part['text']}")
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

            # Return the largest image
            images.sort(key=lambda x: x[1], reverse=True)
            logger.info(f"Successfully generated image: {images[0][0].size[0]}x{images[0][0].size[1]}")
            return images[0][0]

        except Exception as e:
            error_detail = f"Error generating image with GenAI: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e
