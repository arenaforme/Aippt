"""
PPT 转换器主模块
整合 OCR、字体映射、PPT 生成等功能
"""

import logging
from pathlib import Path
from typing import Union, Optional
import cv2

from .models import SlideData, ConversionResult
from .ocr_engine import OCREngine
from .font_mapper import FontMapper
from .ppt_generator import PPTGenerator
from .llm_filter import get_llm_filter
from .utils.image_utils import load_image, remove_text_regions

logger = logging.getLogger(__name__)


class PPTConverter:
    """PPT 转换器，将图片 PPT 转换为可编辑 PPT"""

    def __init__(
        self,
        api_key: str = None,
        secret_key: str = None,
        confidence_threshold: float = 0.6
    ):
        self.ocr_engine = OCREngine(
            api_key=api_key,
            secret_key=secret_key
        )
        self.font_mapper = FontMapper()
        self.confidence_threshold = confidence_threshold

    def convert_images(
        self,
        image_paths: list[Union[str, Path]],
        output_path: Union[str, Path],
        remove_text: bool = True
    ) -> ConversionResult:
        """转换多张图片为可编辑 PPT"""
        generator = PPTGenerator()
        slides_data = []
        total_text_blocks = 0

        for idx, image_path in enumerate(image_paths, start=1):
            slide_data = self._process_single_image(
                image_path, remove_text, index=idx
            )
            if slide_data:
                generator.add_slide(slide_data)
                slides_data.append(slide_data)
                total_text_blocks += len(slide_data.text_blocks)

        output_path = generator.save(output_path)

        return ConversionResult(
            output_path=output_path,
            slides_count=len(slides_data),
            text_blocks_count=total_text_blocks,
            success=True
        )

    def _process_single_image(
        self,
        image_path: Union[str, Path],
        remove_text: bool,
        index: int = 1
    ) -> Optional[SlideData]:
        """处理单张图片"""
        image_path = Path(image_path)
        if not image_path.exists():
            return None

        image = load_image(image_path)
        if image is None:
            return None

        height, width = image.shape[:2]

        # OCR 识别
        text_blocks = self.ocr_engine.recognize(
            image_path, self.confidence_threshold
        )

        # 字体映射
        text_blocks = self.font_mapper.enrich_text_blocks(
            text_blocks, image, height
        )

        # LLM 智能处理（如果配置了 DeepSeek）
        llm_filter = get_llm_filter()
        if llm_filter and text_blocks:
            # 过滤掉 OCR 噪音和误识别
            logger.info(f"第 {index} 页开始 LLM 过滤...")
            text_blocks, filtered_count = llm_filter.filter_text_blocks(
                text_blocks, page_index=index
            )
            logger.info(f"第 {index} 页 LLM 过滤完成，过滤 {filtered_count} 个")

            # 注意：OCR 文字修复功能已禁用
            # 原因：DeepSeek 会参考其他文字块内容来"补全"当前行，导致重复文字
            # 如需启用，需要更严格的验证逻辑或改用单条处理模式

        # 处理背景图片
        if remove_text and text_blocks:
            # 提取 bbox 列表传给 remove_text_regions
            bboxes = [block.bbox for block in text_blocks]
            processed_image = remove_text_regions(image, bboxes)
            processed_path = image_path.with_suffix('.processed.png')
            cv2.imwrite(str(processed_path), processed_image)
            bg_path = processed_path
        else:
            bg_path = image_path

        return SlideData(
            index=index,
            image_path=bg_path,
            width=width,
            height=height,
            text_blocks=text_blocks
        )
