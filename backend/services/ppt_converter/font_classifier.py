"""
字体分类模块
识别图片中文字的字体类别（黑体/宋体/楷体等）
"""

from enum import Enum
import numpy as np
import cv2


class FontCategory(Enum):
    """字体类别枚举"""
    HEITI = "heiti"
    SONGTI = "songti"
    KAITI = "kaiti"
    YUANTI = "yuanti"
    FANGSONG = "fangsong"
    OTHER = "other"


class FontClassifier:
    """字体分类器，使用视觉特征分析来判断字体类别"""

    def __init__(self, use_online_api: bool = True):
        self.use_online_api = use_online_api

    def classify(self, text_image: np.ndarray) -> FontCategory:
        """分类字体类别"""
        if text_image.size == 0:
            return FontCategory.HEITI

        features = self._extract_features(text_image)
        return self._classify_by_features(features)

    def _extract_features(self, image: np.ndarray) -> dict:
        """提取字体视觉特征"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        features = {
            "stroke_width_variance": self._calc_stroke_variance(binary),
            "edge_smoothness": self._calc_edge_smoothness(binary),
        }
        return features

    def _calc_stroke_variance(self, binary: np.ndarray) -> float:
        """计算笔画粗细变化"""
        dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
        if dist.max() == 0:
            return 0.0

        stroke_widths = dist[binary > 0]
        if len(stroke_widths) == 0:
            return 0.0

        mean_width = np.mean(stroke_widths)
        if mean_width == 0:
            return 0.0

        return np.std(stroke_widths) / mean_width

    def _calc_edge_smoothness(self, binary: np.ndarray) -> float:
        """计算边缘平滑度"""
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return 0.0

        total_perimeter = 0
        total_approx_perimeter = 0

        for contour in contours:
            perimeter = cv2.arcLength(contour, True)
            if perimeter < 10:
                continue

            epsilon = 0.02 * perimeter
            approx = cv2.approxPolyDP(contour, epsilon, True)

            total_perimeter += perimeter
            total_approx_perimeter += cv2.arcLength(approx, True)

        if total_perimeter == 0:
            return 0.0

        return total_approx_perimeter / total_perimeter

    def _classify_by_features(self, features: dict) -> FontCategory:
        """基于特征判断字体类别"""
        variance = features.get("stroke_width_variance", 0)
        smoothness = features.get("edge_smoothness", 0)

        if variance > 0.3:
            return FontCategory.SONGTI
        if smoothness > 0.95:
            return FontCategory.YUANTI
        if smoothness < 0.8 and variance > 0.15:
            return FontCategory.KAITI

        return FontCategory.HEITI

    def estimate_font_weight(self, text_image: np.ndarray) -> str:
        """估算字重"""
        if text_image.size == 0:
            return "Regular"

        if len(text_image.shape) == 3:
            gray = cv2.cvtColor(text_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = text_image

        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
        stroke_width = np.mean(dist[dist > 0]) if np.any(dist > 0) else 0

        coords = cv2.findNonZero(binary)
        if coords is None:
            return "Regular"

        _, _, _, char_height = cv2.boundingRect(coords)
        if char_height == 0:
            return "Regular"

        ratio = stroke_width / char_height

        if ratio < 0.08:
            return "Light"
        elif ratio < 0.12:
            return "Regular"
        elif ratio < 0.16:
            return "Medium"
        else:
            return "Bold"
