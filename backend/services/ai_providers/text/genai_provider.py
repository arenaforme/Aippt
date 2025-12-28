"""
Google GenAI SDK implementation for text generation
"""
import logging
import os
from google import genai
from google.genai import types
from .base import TextProvider

logger = logging.getLogger(__name__)


class GenAITextProvider(TextProvider):
    """Text generation using Google GenAI SDK"""

    def __init__(self, api_key: str, api_base: str = None, model: str = "gemini-3-flash-preview"):
        """
        Initialize GenAI text provider

        Args:
            api_key: Google API key
            api_base: API base URL (for proxies like aihubmix)
            model: Model name to use
        """
        # 配置 HTTP 选项
        # 注意：HttpOptions.timeout 单位是毫秒，2分钟 = 120000毫秒
        # SDK 会自动从环境变量读取代理配置（HTTP_PROXY/HTTPS_PROXY）
        http_options = types.HttpOptions(
            base_url=api_base,
            timeout=120000,  # 2分钟超时（毫秒）
        ) if api_base else types.HttpOptions(timeout=120000)

        self.client = genai.Client(
            http_options=http_options,
            api_key=api_key
        )
        self.model = model
    
    def generate_text(self, prompt: str, thinking_budget: int = 1000) -> str:
        """
        Generate text using Google GenAI SDK
        
        Args:
            prompt: The input prompt
            thinking_budget: Thinking budget for the model
            
        Returns:
            Generated text
        """
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=thinking_budget),
            ),
        )
        return response.text
