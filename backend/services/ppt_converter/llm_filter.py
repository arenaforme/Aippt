"""
LLM 智能过滤模块
使用 DeepSeek API 判断 OCR 识别的文字是否应该被提取
"""

import os
import logging
from typing import Optional

from openai import OpenAI

from .models import TextBlock

logger = logging.getLogger(__name__)


def load_deepseek_config() -> dict:
    """
    从环境变量加载 DeepSeek API 配置

    Returns:
        配置字典，包含 api_key, base_url, model
    """
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")

    if not api_key:
        raise ValueError(
            "请设置环境变量 DEEPSEEK_API_KEY"
        )

    return {
        "api_key": api_key,
        "base_url": os.environ.get(
            "DEEPSEEK_BASE_URL",
            "https://api.deepseek.com"
        ),
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    }


class LLMFilter:
    """
    LLM 智能过滤器

    使用 DeepSeek API 判断 OCR 识别的文字是否属于页面正文内容
    """

    def __init__(self):
        config = load_deepseek_config()
        self.client = OpenAI(
            api_key=config["api_key"],
            base_url=config["base_url"]
        )
        self.model = config["model"]

    def filter_text_blocks(
        self,
        text_blocks: list[TextBlock],
        page_index: int = 1
    ) -> tuple[list[TextBlock], int]:
        """
        使用 LLM 过滤 OCR 识别的文字块

        Args:
            text_blocks: OCR 识别的文字块列表
            page_index: 页码（用于日志）

        Returns:
            (过滤后的文字块列表, 被过滤的数量)
        """
        if not text_blocks:
            return [], 0

        # 构建 OCR 文字列表
        ocr_texts = [
            tb.text.strip() for tb in text_blocks if tb.text.strip()
        ]

        if not ocr_texts:
            return [], 0

        # 调用 LLM 判断
        keep_indices = self._call_llm(ocr_texts)

        # 根据 LLM 结果过滤
        filtered = []
        filtered_count = 0

        for i, tb in enumerate(text_blocks):
            if not tb.text.strip():
                continue
            if i in keep_indices:
                filtered.append(tb)
            else:
                filtered_count += 1
                logger.info(f"  LLM 过滤: '{tb.text}'")

        logger.info(
            f"第 {page_index} 页 LLM 过滤完成: "
            f"保留 {len(filtered)}, 过滤 {filtered_count}"
        )

        return filtered, filtered_count

    def _call_llm(self, ocr_texts: list[str]) -> set[int]:
        """
        调用 LLM API 判断哪些文字应该保留

        Args:
            ocr_texts: OCR 识别的文字列表

        Returns:
            应该保留的文字索引集合
        """
        # 构建带编号的文字列表
        numbered_texts = "\n".join(
            f"[{i}] {text}" for i, text in enumerate(ocr_texts)
        )

        prompt = f"""你是一个 PPT 文字提取助手。我正在将图片形式的 PPT 转换为可编辑的 PPT。

OCR 识别出了以下文字块（每行一个，前面是编号）：
{numbered_texts}

请判断哪些 OCR 识别的文字应该被提取到可编辑 PPT 中。

判断标准：
1. 属于页面正文内容的文字应该保留（标题、正文、表格内容、列表项、段落等）
2. 以下内容应该过滤掉：
   - 页码（如单独的数字 "1"、"2"、"第1页" 等）
   - 水印文字
   - 装饰性文字
   - 图片内嵌的文字（如古文献截图、示意图中的标注等）
   - 明显不属于正文的杂乱字符

重要原则：如果不确定，宁可保留，不要误删正文内容。

请直接返回应该保留的文字编号，用逗号分隔。例如：0,1,3,5
如果所有文字都应该保留，返回：all
如果所有文字都应该过滤，返回：none

只返回编号，不要解释。"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )

            result = response.choices[0].message.content.strip().lower()
            logger.info(f"LLM 返回: {result}")
            return self._parse_llm_response(result, len(ocr_texts))

        except Exception as e:
            # API 调用失败时，保留所有文字（降级处理）
            logger.warning(f"LLM API 调用失败: {e}，将保留所有文字")
            return set(range(len(ocr_texts)))

    def _parse_llm_response(
        self,
        response: str,
        total_count: int
    ) -> set[int]:
        """
        解析 LLM 返回的结果

        Args:
            response: LLM 返回的字符串
            total_count: 文字块总数

        Returns:
            应该保留的索引集合
        """
        response = response.strip()

        if response == "all":
            return set(range(total_count))

        if response == "none":
            return set()

        # 解析逗号分隔的编号
        indices = set()
        for part in response.split(","):
            part = part.strip()
            if part.isdigit():
                idx = int(part)
                if 0 <= idx < total_count:
                    indices.add(idx)

        # 如果解析失败（没有有效索引），保留所有
        if not indices and response not in ("none", ""):
            return set(range(total_count))

        return indices

    def fix_ocr_texts(
        self,
        text_blocks: list[TextBlock],
        page_index: int = 1
    ) -> list[TextBlock]:
        """
        使用 LLM 修复 OCR 识别中的缺字、错字问题

        Args:
            text_blocks: OCR 识别的文字块列表
            page_index: 页码（用于日志）

        Returns:
            修复后的文字块列表
        """
        if not text_blocks:
            return []

        # 构建文字列表
        ocr_texts = [tb.text for tb in text_blocks]
        numbered_texts = "\n".join(
            f"[{i}] {text}" for i, text in enumerate(ocr_texts)
        )

        prompt = f"""你是一个 OCR 文字修复助手。以下是从 PPT 图片中 OCR 识别出的文字，可能存在缺字、错字问题。

OCR 识别结果（每行一个，前面是编号）：
{numbered_texts}

请检查每一行文字，如果发现明显的缺字或错字，请修复。常见问题包括：
1. 英文字母被误识别（如 "AGl" 应该是 "AGI"，小写L误识别为大写I）
2. 英文单词末尾缺字母（如 "生成式A" 应该是 "生成式AI"）
3. 明显的错别字

修复原则：
- 只修复单个字符级别的错误，不要补全句子
- 绝对不要添加原文中没有的词语或短语
- 如果句子看起来不完整，保持原样，不要尝试补全
- 如果不确定，保持原样
- 修复后的文字长度应该与原文接近（最多增加1-2个字符）

请按以下格式返回修复结果，每行一个：
[编号] 修复后的文字

如果某行不需要修复，不用输出该行。
如果所有文字都不需要修复，返回：none"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )

            result = response.choices[0].message.content.strip()
            logger.info(f"LLM 修复返回: {result}")

            # 解析修复结果
            if result.lower() == "none":
                return text_blocks

            fixes = {}
            for line in result.split("\n"):
                line = line.strip()
                if line.startswith("[") and "]" in line:
                    try:
                        idx_end = line.index("]")
                        idx = int(line[1:idx_end])
                        fixed_text = line[idx_end + 1:].strip()
                        if 0 <= idx < len(text_blocks) and fixed_text:
                            fixes[idx] = fixed_text
                    except (ValueError, IndexError):
                        continue

            # 应用修复
            fixed_count = 0
            for idx, fixed_text in fixes.items():
                original = text_blocks[idx].text
                if original != fixed_text:
                    logger.info(
                        f"  修复 [{idx}]: '{original}' -> '{fixed_text}'"
                    )
                    text_blocks[idx].text = fixed_text
                    fixed_count += 1

            logger.info(
                f"第 {page_index} 页 OCR 修复完成: 修复 {fixed_count} 处"
            )
            return text_blocks

        except Exception as e:
            logger.warning(f"LLM OCR 修复失败: {e}，保持原样")
            return text_blocks


# 全局实例（延迟初始化）
_llm_filter: Optional[LLMFilter] = None


def get_llm_filter() -> Optional[LLMFilter]:
    """
    获取 LLM 过滤器实例（单例模式）

    Returns:
        LLMFilter 实例，如果未配置则返回 None
    """
    global _llm_filter

    if _llm_filter is not None:
        return _llm_filter

    # 检查是否配置了 DeepSeek
    if not os.environ.get("DEEPSEEK_API_KEY"):
        return None

    try:
        _llm_filter = LLMFilter()
        return _llm_filter
    except Exception as e:
        logger.warning(f"LLM 过滤器初始化失败: {e}")
        return None
