"""
数据模型定义
定义系统中使用的核心数据结构
"""

from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path


@dataclass
class TextBlock:
    """单个文字块的识别结果"""
    text: str                                    # 文字内容
    bbox: tuple[int, int, int, int]              # 边界框 (x, y, width, height)
    confidence: float = 0.0                      # 识别置信度 (0-1)
    font_size: int = 12                          # 估算字号 (pt)
    font_category: str = "heiti"                 # 字体类别
    font_weight: str = "Regular"                 # 字重
    font_name: str = "Noto Sans SC"              # 映射后的字体名称
    color: tuple[int, int, int] = (0, 0, 0)      # RGB 颜色


@dataclass
class SlideData:
    """单页幻灯片数据"""
    index: int                                   # 页码（从1开始）
    image_path: Path                             # 原始图片路径
    width: int = 0                               # 图片宽度 (px)
    height: int = 0                              # 图片高度 (px)
    text_blocks: list[TextBlock] = field(default_factory=list)


@dataclass
class ConversionResult:
    """转换结果"""
    success: bool
    output_path: Optional[Path] = None
    slides_count: int = 0
    text_blocks_count: int = 0
    error_message: Optional[str] = None
