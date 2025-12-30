"""
字体映射模块
将识别出的字体类别映射到具体的免费字体
"""

import logging
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
import numpy as np

from .font_classifier import FontCategory, FontClassifier
from .utils.color_utils import extract_text_color
from .utils.font_utils import (
    get_font_path,
    get_font_display_name,
    estimate_font_size_pt,
)
from .utils.image_utils import crop_image
from .models import TextBlock

logger = logging.getLogger(__name__)


@dataclass
class FontMapping:
    """字体映射结果"""
    category: str
    weight: str
    font_name: str
    font_path: Optional[Path]
    color: tuple[int, int, int]
    font_size: int


class FontMapper:
    """字体映射器"""

    def __init__(self):
        self.classifier = FontClassifier()

    # 字号阈值：大于等于此值判定为标题（黑体）
    TITLE_FONT_SIZE_THRESHOLD = 24

    def map_font(
        self,
        text_image: np.ndarray,
        bbox_height: int,
        image_height: int
    ) -> FontMapping:
        """分析文字图像并映射到具体字体"""
        # 先计算字号
        font_size = estimate_font_size_pt(bbox_height, image_height)

        # 字号启发式分类：大字号用黑体（标题），小字号用宋体（正文）
        if font_size >= self.TITLE_FONT_SIZE_THRESHOLD:
            category = FontCategory.HEITI
        else:
            category = FontCategory.SONGTI

        weight = self.classifier.estimate_font_weight(text_image)
        color = extract_text_color(text_image)
        font_path = get_font_path(category.value, weight)
        font_name = get_font_display_name(category.value)

        return FontMapping(
            category=category.value,
            weight=weight,
            font_name=font_name,
            font_path=font_path,
            color=color,
            font_size=font_size
        )

    def enrich_text_block(
        self,
        text_block: TextBlock,
        full_image: np.ndarray,
        image_height: int
    ) -> TextBlock:
        """为 TextBlock 填充字体信息"""
        x, y, w, h = text_block.bbox
        text_image = crop_image(full_image, text_block.bbox)

        mapping = self.map_font(text_image, h, image_height)

        text_block.font_category = mapping.category
        text_block.font_weight = mapping.weight
        text_block.font_name = mapping.font_name
        text_block.font_size = mapping.font_size
        text_block.color = mapping.color

        # 调试日志：输出映射结果
        text_preview = text_block.text[:15] if len(text_block.text) > 15 else text_block.text
        logger.info(
            f"字体映射: '{text_preview}' -> "
            f"{mapping.font_size}pt -> {mapping.category}/{mapping.font_name}"
        )

        return text_block

    def enrich_text_blocks(
        self,
        text_blocks: list[TextBlock],
        full_image: np.ndarray,
        image_height: int
    ) -> list[TextBlock]:
        """批量为 TextBlock 列表填充字体信息"""
        return [
            self.enrich_text_block(tb, full_image, image_height)
            for tb in text_blocks
        ]
