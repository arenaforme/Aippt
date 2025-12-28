"""
字体映射模块
将识别出的字体类别映射到具体的免费字体
"""

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

    def map_font(
        self,
        text_image: np.ndarray,
        bbox_height: int,
        image_height: int
    ) -> FontMapping:
        """分析文字图像并映射到具体字体"""
        category = self.classifier.classify(text_image)
        weight = self.classifier.estimate_font_weight(text_image)
        color = extract_text_color(text_image)
        font_size = estimate_font_size_pt(bbox_height, image_height)
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
