"""
Google GenAI implementation for text generation
Supports both SDK mode (for Google official API) and HTTP mode (for third-party APIs)
"""
import logging
import httpx
from google import genai
from google.genai import types
from .base import TextProvider

logger = logging.getLogger(__name__)


class GenAITextProvider(TextProvider):
    """Text generation supporting both Google SDK and HTTP direct calls"""

    def __init__(self, api_key: str, api_base: str = None, model: str = "gemini-3-flash-preview"):
        """
        Initialize GenAI text provider

        Args:
            api_key: Google API key
            api_base: API base URL (for proxies)
            model: Model name to use
        """
        self.api_key = api_key
        self.api_base = api_base
        self.model = model
        self.timeout = 120.0  # 2 minutes

        # 判断是否使用 Google 官方 API
        self._use_sdk = self._is_google_official_api()

        if self._use_sdk:
            # 使用 Google SDK
            http_options = types.HttpOptions(
                base_url=api_base,
                timeout=120000,  # 2分钟超时（毫秒）
            ) if api_base else types.HttpOptions(timeout=120000)

            self.client = genai.Client(
                http_options=http_options,
                api_key=api_key
            )
            logger.info(f"GenAI Text Provider initialized with SDK mode")
        else:
            logger.info(f"GenAI Text Provider initialized with HTTP mode, api_base: {api_base}")

    def _is_google_official_api(self) -> bool:
        """判断是否使用 Google 官方 API"""
        if not self.api_base:
            return True
        return "googleapis.com" in self.api_base

    def generate_text(self, prompt: str, thinking_budget: int = 1000) -> str:
        """
        Generate text using SDK or HTTP based on configuration

        Args:
            prompt: The input prompt
            thinking_budget: Thinking budget for the model

        Returns:
            Generated text
        """
        if self._use_sdk:
            return self._generate_with_sdk(prompt, thinking_budget)
        else:
            return self._generate_with_http(prompt, thinking_budget)

    def _generate_with_sdk(self, prompt: str, thinking_budget: int) -> str:
        """使用 Google SDK 生成文本"""
        try:
            # 只有特定模型支持 thinking_config
            supports_thinking = "gemini-3" in self.model or "gemini-2.5" in self.model

            if supports_thinking and thinking_budget > 0:
                config = types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=thinking_budget),
                )
            else:
                config = types.GenerateContentConfig()

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
            return response.text
        except Exception as e:
            error_detail = f"Error generating text with GenAI SDK: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e

    def _generate_with_http(self, prompt: str, thinking_budget: int) -> str:
        """使用 HTTP 直接请求生成文本（用于第三方 API）"""
        try:
            # 只有特定模型支持 thinking_config
            supports_thinking = "gemini-3" in self.model or "gemini-2.5" in self.model

            # Build request payload
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {}
            }

            if supports_thinking and thinking_budget > 0:
                payload["generationConfig"]["thinkingConfig"] = {"thinkingBudget": thinking_budget}

            # Third-party API uses Bearer token
            api_base = self.api_base or "https://generativelanguage.googleapis.com"
            url = f"{api_base}/v1beta/models/{self.model}:generateContent"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }

            logger.info(f"Calling GenAI API (HTTP): {url}")

            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload, headers=headers)

            if response.status_code != 200:
                error_text = response.text[:500]
                raise ValueError(f"API returned status {response.status_code}: {error_text}")

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                logger.error(f"API response has no candidates: {data}")
                raise ValueError("API response has no candidates")

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])

            for part in parts:
                if "text" in part:
                    return part["text"]

            raise ValueError("No text found in API response")

        except Exception as e:
            error_detail = f"Error generating text with GenAI HTTP: {type(e).__name__}: {str(e)}"
            logger.error(error_detail, exc_info=True)
            raise Exception(error_detail) from e
