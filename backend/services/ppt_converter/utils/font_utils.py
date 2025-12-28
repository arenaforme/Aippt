"""
字体工具模块
提供字体路径管理和字号估算功能
"""

from pathlib import Path
from typing import Optional
import os


# 项目根目录（banana-slides/backend）
# font_utils.py 位于 backend/services/ppt_converter/utils/
# 向上4级: utils -> ppt_converter -> services -> backend
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

# 字体目录
FONTS_DIR = PROJECT_ROOT / "fonts"


# 字体映射表：(类别, 字重) -> 字体文件名
FONT_FILES = {
    ("heiti", "Light"): "NotoSansSC-Regular.ttf",
    ("heiti", "Regular"): "NotoSansSC-Regular.ttf",
    ("heiti", "Medium"): "NotoSansSC-Regular.ttf",
    ("heiti", "Bold"): "NotoSansSC-Regular.ttf",
    ("songti", "Regular"): "NotoSerifSC-Regular.ttf",
    ("songti", "Bold"): "NotoSerifSC-Regular.ttf",
    ("kaiti", "Regular"): "LXGWWenKai-Regular.ttf",
    ("yuanti", "Regular"): "NotoSansSC-Regular.ttf",
    ("fangsong", "Regular"): "NotoSerifSC-Regular.ttf",
    ("other", "Regular"): "NotoSansSC-Regular.ttf",
}

# 字体显示名称映射
FONT_DISPLAY_NAMES = {
    "heiti": "Noto Sans SC",
    "songti": "Noto Serif SC",
    "kaiti": "LXGW WenKai",
    "yuanti": "Noto Sans SC",
    "fangsong": "Noto Serif SC",
    "other": "Noto Sans SC",
}


def get_font_path(
    category: str = "heiti",
    weight: str = "Regular"
) -> Optional[Path]:
    """获取字体文件路径"""
    key = (category, weight)

    if key not in FONT_FILES:
        key = (category, "Regular")
    if key not in FONT_FILES:
        key = ("heiti", "Regular")

    font_file = FONT_FILES.get(key)
    if font_file:
        font_path = FONTS_DIR / font_file
        if font_path.exists():
            return font_path

    return None


def get_font_display_name(category: str) -> str:
    """获取字体显示名称"""
    return FONT_DISPLAY_NAMES.get(category, "Noto Sans SC")


def estimate_font_size_pt(
    bbox_height: int,
    image_height: int,
    slide_height_pt: int = 540
) -> int:
    """根据边界框高度估算字号（磅值）"""
    px_to_pt_ratio = slide_height_pt / image_height
    estimated_pt = int(bbox_height * px_to_pt_ratio * 1.0)
    return max(8, min(estimated_pt, 144))
