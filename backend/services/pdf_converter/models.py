"""
PDF 转换数据模型
"""

from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path


@dataclass
class PDFTextBlock:
    """PDF 中的文本块"""
    text: str                                    # 文字内容
    bbox: tuple[float, float, float, float]      # 边界框 (x0, y0, x1, y1)
    font_size: float = 12.0                      # 字号
    font_name: str = ""                          # 原始字体名
    color: tuple[int, int, int] = (0, 0, 0)      # RGB 颜色
    is_bold: bool = False                        # 是否粗体


@dataclass
class PDFImage:
    """PDF 中的图片"""
    image_data: bytes                            # 图片二进制数据
    bbox: tuple[float, float, float, float]      # 边界框 (x0, y0, x1, y1)
    ext: str = "png"                             # 图片格式


@dataclass
class PDFPageData:
    """单页 PDF 数据"""
    index: int                                   # 页码（从1开始）
    width: float                                 # 页面宽度 (pt)
    height: float                                # 页面高度 (pt)
    text_blocks: list[PDFTextBlock] = field(default_factory=list)
    images: list[PDFImage] = field(default_factory=list)
    background_color: tuple[int, int, int] = (255, 255, 255)


@dataclass
class PDFConversionResult:
    """转换结果"""
    success: bool
    output_path: Optional[Path] = None
    pages_count: int = 0
    text_blocks_count: int = 0
    images_count: int = 0
    error_message: Optional[str] = None
