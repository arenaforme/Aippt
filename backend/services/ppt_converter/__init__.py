"""
PPT 可编辑文字转换模块
将图片形式的 PPT 转换为可编辑文字的 PPT

从 geminipptskill 项目移植并适配
"""

from .models import TextBlock, SlideData, ConversionResult
from .ocr_engine import OCREngine
from .font_mapper import FontMapper
from .ppt_generator import PPTGenerator
from .converter import PPTConverter

__all__ = [
    "TextBlock",
    "SlideData",
    "ConversionResult",
    "OCREngine",
    "FontMapper",
    "PPTGenerator",
    "PPTConverter",
]
