"""
图像处理工具模块
提供图像加载、缩放、裁剪等基础功能
"""

from pathlib import Path
from typing import Union
import numpy as np
from PIL import Image
import cv2


def load_image(image_path: Union[str, Path]) -> np.ndarray:
    """
    加载图像文件

    Args:
        image_path: 图像文件路径

    Returns:
        numpy数组格式的图像 (BGR格式)
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"图像文件不存在: {path}")

    pil_image = Image.open(path)
    if pil_image.mode == "RGBA":
        pil_image = pil_image.convert("RGB")

    image = np.array(pil_image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image


def crop_image(
    image: np.ndarray,
    bbox: tuple[int, int, int, int]
) -> np.ndarray:
    """裁剪图像区域"""
    x, y, w, h = bbox
    return image[y:y+h, x:x+w]


def get_image_dimensions(image_path: Union[str, Path]) -> tuple[int, int]:
    """获取图像尺寸，返回 (width, height)"""
    with Image.open(image_path) as img:
        return img.size
