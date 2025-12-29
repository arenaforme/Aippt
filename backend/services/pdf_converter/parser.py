"""
PDF 解析器
使用 PyMuPDF 提取 PDF 中的文本和图片
"""

import logging
from pathlib import Path
from typing import Optional, Callable

import fitz  # PyMuPDF

from .models import PDFTextBlock, PDFImage, PDFPageData

logger = logging.getLogger(__name__)


class PDFParser:
    """PDF 解析器"""

    def __init__(self, pdf_path: str | Path):
        self.pdf_path = Path(pdf_path)
        self.doc: Optional[fitz.Document] = None

    def __enter__(self):
        self.doc = fitz.open(str(self.pdf_path))
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.doc:
            self.doc.close()

    def get_page_count(self) -> int:
        """获取页数"""
        return len(self.doc) if self.doc else 0

    def parse_page(self, page_num: int) -> PDFPageData:
        """
        解析单页 PDF

        Args:
            page_num: 页码（从0开始）
        """
        page = self.doc[page_num]
        rect = page.rect

        page_data = PDFPageData(
            index=page_num + 1,
            width=rect.width,
            height=rect.height
        )

        # 提取文本块
        page_data.text_blocks = self._extract_text_blocks(page)

        # 提取图片
        page_data.images = self._extract_images(page)

        return page_data

    def _extract_text_blocks(self, page: fitz.Page) -> list[PDFTextBlock]:
        """提取页面中的文本块"""
        text_blocks = []

        # 使用 dict 模式获取详细文本信息
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        for block in blocks.get("blocks", []):
            if block.get("type") != 0:  # 0 = 文本块
                continue

            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue

                    bbox = span.get("bbox", (0, 0, 0, 0))
                    font_size = span.get("size", 12)
                    font_name = span.get("font", "")
                    flags = span.get("flags", 0)

                    # 解析颜色（整数格式转 RGB）
                    color_int = span.get("color", 0)
                    r = (color_int >> 16) & 0xFF
                    g = (color_int >> 8) & 0xFF
                    b = color_int & 0xFF

                    text_blocks.append(PDFTextBlock(
                        text=text,
                        bbox=bbox,
                        font_size=font_size,
                        font_name=font_name,
                        color=(r, g, b),
                        is_bold=bool(flags & 2 ** 4)  # bit 4 = bold
                    ))

        return text_blocks

    def _extract_images(self, page: fitz.Page) -> list[PDFImage]:
        """提取页面中的图片"""
        images = []

        for img_info in page.get_images(full=True):
            xref = img_info[0]

            try:
                base_image = self.doc.extract_image(xref)
                if not base_image:
                    continue

                image_data = base_image.get("image")
                ext = base_image.get("ext", "png")

                # 获取图片在页面上的位置
                img_rects = page.get_image_rects(xref)
                if img_rects:
                    rect = img_rects[0]
                    bbox = (rect.x0, rect.y0, rect.x1, rect.y1)
                else:
                    bbox = (0, 0, 100, 100)

                images.append(PDFImage(
                    image_data=image_data,
                    bbox=bbox,
                    ext=ext
                ))

            except Exception as e:
                logger.warning(f"提取图片失败 xref={xref}: {e}")
                continue

        return images

    def render_page_to_image(
        self,
        page_num: int,
        output_path: Path,
        dpi: int = 150
    ) -> Path:
        """
        将 PDF 页面渲染为图片

        Args:
            page_num: 页码（从0开始）
            output_path: 输出图片路径
            dpi: 分辨率（默认 150）

        Returns:
            输出图片路径
        """
        page = self.doc[page_num]

        # 计算缩放比例（72 DPI 是 PDF 默认分辨率）
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)

        # 渲染页面为 pixmap
        pix = page.get_pixmap(matrix=mat)

        # 保存为 PNG
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        pix.save(str(output_path))

        return output_path
