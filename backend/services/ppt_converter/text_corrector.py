"""
文本校正模块
使用原始文本对 OCR 识别结果进行校正，修复遗漏和错别字
"""

import re
import logging
from pathlib import Path
from typing import Optional
from difflib import SequenceMatcher

from .models import TextBlock

logger = logging.getLogger(__name__)


class TextCorrector:
    """文本校正器"""

    def __init__(self, reference_text: str, similarity_threshold: float = 0.6):
        """
        初始化校正器

        Args:
            reference_text: 原始参考文本（包含所有页面的文字）
            similarity_threshold: 相似度阈值，高于此值才进行替换
        """
        self.similarity_threshold = similarity_threshold
        # 解析参考文本，按页分组
        self.pages_text = self._parse_reference_text(reference_text)
        # 提取所有文本片段用于匹配
        self.all_segments = self._extract_segments(reference_text)

    def _parse_reference_text(self, text: str) -> dict[int, list[str]]:
        """
        解析参考文本，按页分组

        格式：##第N页 作为页面分隔符
        """
        pages = {}
        current_page = 0
        current_lines = []

        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue

            # 检查是否是页面标记
            page_match = re.match(r'##第(\d+)页', line)
            if page_match:
                if current_lines and current_page > 0:
                    pages[current_page] = current_lines
                current_page = int(page_match.group(1))
                current_lines = []
            else:
                # 清理行内容，移除 markdown 格式
                clean_line = self._clean_text(line)
                if clean_line:
                    current_lines.append(clean_line)

        # 保存最后一页
        if current_lines and current_page > 0:
            pages[current_page] = current_lines

        return pages

    def _extract_segments(self, text: str) -> list[str]:
        """提取所有文本片段用于匹配"""
        segments = []
        for line in text.split('\n'):
            clean = self._clean_text(line)
            if clean and len(clean) >= 2:
                segments.append(clean)
                # 对于较长的文本，也添加子片段
                if len(clean) > 20:
                    # 按标点分割
                    for part in re.split(r'[，。、；：！？]', clean):
                        part = part.strip()
                        if part and len(part) >= 2:
                            segments.append(part)
        return segments

    def _clean_text(self, text: str) -> str:
        """清理文本，移除 markdown 格式和特殊字符"""
        # 移除 markdown 格式
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold**
        text = re.sub(r'\*([^*]+)\*', r'\1', text)  # *italic*
        text = re.sub(r'^[-*]\s*', '', text)  # 列表项
        text = re.sub(r'^\|.*\|$', '', text)  # 表格行
        text = re.sub(r'^:?-+:?$', '', text)  # 表格分隔符
        text = re.sub(r'^页面(标题|文字)：', '', text)  # 页面标记
        text = re.sub(r'^其他页面素材：', '', text)
        return text.strip()

    def _similarity(self, s1: str, s2: str) -> float:
        """计算两个字符串的相似度"""
        if not s1 or not s2:
            return 0.0
        return SequenceMatcher(None, s1, s2).ratio()

    def _find_best_match(
        self,
        ocr_text: str,
        page_num: Optional[int] = None
    ) -> tuple[Optional[str], float]:
        """
        在参考文本中查找最佳匹配

        Args:
            ocr_text: OCR 识别的文本
            page_num: 页码（如果提供，优先在该页查找）

        Returns:
            (最佳匹配文本, 相似度)
        """
        if not ocr_text or len(ocr_text) < 2:
            return None, 0.0

        best_match = None
        best_score = 0.0

        # 如果提供了页码，优先在该页查找
        if page_num and page_num in self.pages_text:
            for ref_text in self.pages_text[page_num]:
                # 完全匹配
                if ocr_text in ref_text:
                    return ref_text, 1.0

                # 检查 OCR 文本是否是参考文本的子串（可能有遗漏）
                if self._is_partial_match(ocr_text, ref_text):
                    score = len(ocr_text) / len(ref_text) + 0.3
                    if score > best_score:
                        best_score = min(score, 0.95)
                        best_match = ref_text

                # 计算相似度
                score = self._similarity(ocr_text, ref_text)
                if score > best_score:
                    best_score = score
                    best_match = ref_text

        # 如果在当前页没找到好的匹配，在所有片段中查找
        if best_score < self.similarity_threshold:
            for segment in self.all_segments:
                if ocr_text in segment:
                    return segment, 1.0

                if self._is_partial_match(ocr_text, segment):
                    score = len(ocr_text) / len(segment) + 0.3
                    if score > best_score:
                        best_score = min(score, 0.95)
                        best_match = segment

                score = self._similarity(ocr_text, segment)
                if score > best_score:
                    best_score = score
                    best_match = segment

        return best_match, best_score

    def _is_partial_match(self, ocr_text: str, ref_text: str) -> bool:
        """
        检查 OCR 文本是否是参考文本的部分匹配（可能有字符遗漏）

        例如：OCR="A时代" 应该匹配 ref="AI时代"
        """
        if len(ocr_text) >= len(ref_text):
            return False

        # 检查 OCR 文本的字符是否都在参考文本中按顺序出现
        ref_idx = 0
        matched = 0
        for char in ocr_text:
            while ref_idx < len(ref_text):
                if ref_text[ref_idx] == char:
                    matched += 1
                    ref_idx += 1
                    break
                ref_idx += 1

        # 如果匹配了大部分字符，认为是部分匹配
        return matched >= len(ocr_text) * 0.8

    def correct_text_block(
        self,
        text_block: TextBlock,
        page_num: Optional[int] = None
    ) -> TextBlock:
        """
        校正单个文本块

        Args:
            text_block: OCR 识别的文本块
            page_num: 页码

        Returns:
            校正后的文本块
        """
        ocr_text = text_block.text.strip()
        if not ocr_text:
            return text_block

        best_match, score = self._find_best_match(ocr_text, page_num)

        if best_match and score >= self.similarity_threshold:
            if best_match != ocr_text:
                logger.info(
                    f"文本校正: '{ocr_text}' -> '{best_match}' "
                    f"(相似度: {score:.2f})"
                )
                text_block.text = best_match
            else:
                logger.debug(f"文本匹配，无需校正: '{ocr_text}'")
        else:
            logger.debug(
                f"未找到匹配: '{ocr_text}' "
                f"(最佳匹配: '{best_match}', 相似度: {score:.2f})"
            )

        return text_block

    def correct_text_blocks(
        self,
        text_blocks: list[TextBlock],
        page_num: Optional[int] = None
    ) -> list[TextBlock]:
        """
        批量校正文本块

        Args:
            text_blocks: OCR 识别的文本块列表
            page_num: 页码

        Returns:
            校正后的文本块列表
        """
        return [
            self.correct_text_block(tb, page_num)
            for tb in text_blocks
        ]


def load_reference_text(pdf_path: Path) -> Optional[str]:
    """
    加载与 PDF 同名的 .txt 参考文件

    查找顺序：
    1. PDF 同目录下的同名 .txt 文件
    2. geminipptskill/pptxdir 目录下的同名 .txt 文件

    Args:
        pdf_path: PDF 文件路径

    Returns:
        参考文本内容，如果找不到则返回 None
    """
    pdf_path = Path(pdf_path)
    base_name = pdf_path.stem

    # 查找位置列表
    search_paths = [
        pdf_path.with_suffix('.txt'),  # 同目录
        Path('/Users/jianchen/develop/claude/projects/geminipptskill/pptxdir')
        / f'{base_name}.txt',
    ]

    for txt_path in search_paths:
        if txt_path.exists():
            logger.info(f"找到参考文本文件: {txt_path}")
            try:
                return txt_path.read_text(encoding='utf-8')
            except Exception as e:
                logger.warning(f"读取参考文本失败: {e}")

    logger.info(f"未找到 PDF '{base_name}' 的参考文本文件")
    return None
