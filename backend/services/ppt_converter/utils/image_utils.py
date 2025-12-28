"""
图像处理工具模块
提供图像加载、缩放、裁剪、文字擦除等功能
"""

from pathlib import Path
from typing import Union
import numpy as np
from PIL import Image
import cv2


def load_image(image_path: Union[str, Path]) -> np.ndarray:
    """加载图像文件，返回 BGR 格式的 numpy 数组"""
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


def _detect_background_color(
    image: np.ndarray,
    bbox: tuple[int, int, int, int],
    sample_width: int = 15
) -> tuple[np.ndarray, bool]:
    """检测文字区域周围的背景颜色"""
    h, w = image.shape[:2]
    x, y, bw, bh = bbox

    samples = []
    if y > sample_width:
        samples.extend(image[y-sample_width:y, x:x+bw].reshape(-1, 3))
    if y + bh + sample_width < h:
        samples.extend(image[y+bh:y+bh+sample_width, x:x+bw].reshape(-1, 3))
    if x > sample_width:
        samples.extend(image[y:y+bh, x-sample_width:x].reshape(-1, 3))
    if x + bw + sample_width < w:
        samples.extend(image[y:y+bh, x+bw:x+bw+sample_width].reshape(-1, 3))

    if not samples:
        return np.array([255, 255, 255], dtype=np.uint8), True

    samples = np.array(samples)
    median_color = np.median(samples, axis=0).astype(np.uint8)

    diffs = np.abs(samples.astype(np.float32) - median_color)
    valid_mask = np.all(diffs < 50, axis=1)
    if np.sum(valid_mask) > 10:
        valid_samples = samples[valid_mask]
        std_color = np.std(valid_samples, axis=0)
    else:
        std_color = np.std(samples, axis=0)

    is_solid = np.all(std_color < 40)
    return median_color, is_solid


def remove_text_regions(
    image: np.ndarray,
    bboxes: list[tuple[int, int, int, int]],
    padding: int = 5,
    dynamic_padding: bool = True
) -> np.ndarray:
    """
    智能擦除文字区域：优先使用颜色填充，最大限度避免 inpaint 伪影
    """
    if not bboxes:
        return image.copy()

    result = image.copy()
    h, w = image.shape[:2]

    for bbox in bboxes:
        x, y, bw, bh = bbox

        if dynamic_padding:
            actual_padding = max(3, min(15, int(bh * 0.15)))
        else:
            actual_padding = padding

        x1 = max(0, x - actual_padding)
        y1 = max(0, y - actual_padding)
        x2 = min(w, x + bw + actual_padding)
        y2 = min(h, y + bh + actual_padding)

        bg_color, is_solid = _detect_background_color(image, bbox)

        if is_solid:
            result[y1:y2, x1:x2] = bg_color
        else:
            center_margin = 2
            cx1 = x1 + center_margin
            cy1 = y1 + center_margin
            cx2 = x2 - center_margin
            cy2 = y2 - center_margin

            if cx2 > cx1 and cy2 > cy1:
                result[cy1:cy2, cx1:cx2] = bg_color

            edge_mask = np.zeros((h, w), dtype=np.uint8)
            edge_mask[y1:y2, x1:x2] = 255
            if cx2 > cx1 and cy2 > cy1:
                edge_mask[cy1:cy2, cx1:cx2] = 0

            if np.any(edge_mask):
                result = cv2.inpaint(result, edge_mask, 3, cv2.INPAINT_TELEA)

    return result


def save_image(image: np.ndarray, output_path: Union[str, Path]) -> Path:
    """保存图像到文件"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_image)
    pil_image.save(output_path, quality=95)

    return output_path
