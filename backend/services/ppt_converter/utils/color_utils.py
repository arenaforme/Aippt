"""
颜色提取工具模块
从图像中提取文字颜色
"""

import numpy as np
from sklearn.cluster import KMeans
import cv2


def extract_text_color(
    text_image: np.ndarray,
    n_colors: int = 2
) -> tuple[int, int, int]:
    """
    从文字区域提取文字颜色

    使用 K-Means 聚类分离前景色（文字）和背景色，
    选择较深的颜色作为文字色
    """
    if text_image is None or text_image.size == 0:
        return (0, 0, 0)

    try:
        rgb_image = cv2.cvtColor(text_image, cv2.COLOR_BGR2RGB)
        pixels = rgb_image.reshape(-1, 3).astype(np.float64)

        if len(pixels) < n_colors:
            avg = pixels.mean(axis=0).astype(int)
            return (int(avg[0]), int(avg[1]), int(avg[2]))

        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
        kmeans.fit(pixels)

        colors = kmeans.cluster_centers_.astype(int)
        luminances = [0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] for c in colors]

        text_color_idx = np.argmin(luminances)
        text_color = colors[text_color_idx]

        return (int(text_color[0]), int(text_color[1]), int(text_color[2]))

    except Exception:
        return (0, 0, 0)
