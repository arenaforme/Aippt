"""
File Parser Service - handles file parsing using Docling service and image captioning
"""
import os
import re
import time
import logging
import uuid
import io
import base64
import requests
from typing import Optional, List
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
from markitdown import MarkItDown

logger = logging.getLogger(__name__)


def _get_ai_provider_format(provider_format: str = None) -> str:
    """Get the configured AI provider format
    
    Priority:
        1. Provided provider_format parameter
        2. Flask app.config['AI_PROVIDER_FORMAT'] (from database settings)
        3. Environment variable AI_PROVIDER_FORMAT
        4. Default: 'gemini'
    
    Args:
        provider_format: Optional provider format string. If not provided, reads from Flask config or environment variable.
    """
    if provider_format:
        return provider_format.lower()
    
    # Try to get from Flask app config first (database settings)
    try:
        from flask import current_app
        if current_app and hasattr(current_app, 'config'):
            config_value = current_app.config.get('AI_PROVIDER_FORMAT')
            if config_value:
                return str(config_value).lower()
    except RuntimeError:
        # Not in Flask application context
        pass
    
    # Fallback to environment variable
    return os.getenv('AI_PROVIDER_FORMAT', 'gemini').lower()


class FileParserService:
    """Service for parsing files using Docling and enhancing with image captions"""

    def __init__(self, docling_api_base: str = "http://127.0.0.1:5004",
                 file_parse_max_size: int = 50 * 1024 * 1024,
                 google_api_key: str = "", google_api_base: str = "",
                 openai_api_key: str = "", openai_api_base: str = "",
                 image_caption_model: str = "gemini-3-flash-preview",
                 provider_format: str = None):
        """
        Initialize the file parser service

        Args:
            docling_api_base: Docling API base URL
            file_parse_max_size: Maximum file size for parsing (bytes), default 50MB
            google_api_key: Google Gemini API key for image captioning
            google_api_base: Google Gemini API base URL
            openai_api_key: OpenAI API key for image captioning
            openai_api_base: OpenAI API base URL
            image_caption_model: Model to use for image captioning
            provider_format: AI provider format ('gemini' or 'openai')
        """
        self.docling_api_base = docling_api_base.rstrip('/')
        self.file_parse_max_size = file_parse_max_size

        # Store config for lazy initialization
        self._google_api_key = google_api_key
        self._google_api_base = google_api_base
        self._openai_api_key = openai_api_key
        self._openai_api_base = openai_api_base
        self.image_caption_model = image_caption_model

        # Clients will be initialized lazily based on AI_PROVIDER_FORMAT
        self._gemini_client = None
        self._openai_client = None
        self._provider_format = _get_ai_provider_format(provider_format)
    
    def _get_gemini_client(self):
        """Lazily initialize Gemini client"""
        if self._gemini_client is None and self._google_api_key:
            from google import genai
            from google.genai import types
            self._gemini_client = genai.Client(
                http_options=types.HttpOptions(base_url=self._google_api_base) if self._google_api_base else None,
                api_key=self._google_api_key
            )
        return self._gemini_client
    
    def _get_openai_client(self):
        """Lazily initialize OpenAI client"""
        if self._openai_client is None and self._openai_api_key:
            from openai import OpenAI
            self._openai_client = OpenAI(
                api_key=self._openai_api_key,
                base_url=self._openai_api_base
            )
        return self._openai_client
    
    def _can_generate_captions(self) -> bool:
        """Check if image caption generation is available"""
        if self._provider_format == 'openai':
            return bool(self._openai_api_key)
        else:
            return bool(self._google_api_key)
    
    def parse_file(self, file_path: str, filename: str) -> tuple[Optional[str], Optional[str], Optional[str], int]:
        """
        Parse a file using Docling service and enhance with image captions

        Args:
            file_path: Path to the file to parse
            filename: Original filename

        Returns:
            Tuple of (task_id, markdown_content, error_message, failed_image_count)
            - task_id: Task ID for tracking (None for text files)
            - markdown_content: Parsed markdown with enhanced image descriptions
            - error_message: Error message if parsing failed
            - failed_image_count: Number of images that failed to generate captions
        """
        try:
            # Check file size limit
            file_size = os.path.getsize(file_path)
            if file_size > self.file_parse_max_size:
                max_mb = self.file_parse_max_size / (1024 * 1024)
                error_msg = f"文件大小超过限制：{file_size / (1024 * 1024):.1f}MB > {max_mb:.0f}MB"
                logger.error(error_msg)
                return None, None, error_msg, 0

            # Check if it's a plain text file that doesn't need Docling parsing
            file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

            if file_ext in ['txt', 'md', 'markdown']:
                logger.info(f"File {filename} is a plain text file, reading directly...")
                return self._parse_text_file(file_path, filename)

            # Check if it's a spreadsheet file (xlsx, csv) - use markitdown
            if file_ext in ['xlsx', 'xls', 'csv']:
                logger.info(f"File {filename} is a spreadsheet file, using markitdown...")
                return self._parse_spreadsheet_file(file_path, filename)

            # For other file types (pdf, docx, pptx), use Docling service
            logger.info(f"File {filename} requires Docling parsing...")

            # Parse with Docling
            logger.info(f"Step 1/2: Parsing file with Docling...")
            markdown_content, error = self._parse_with_docling(file_path, filename)
            if error:
                return None, None, error, 0

            logger.info("File parsed successfully.")

            # Step 2: Enhance markdown with image captions
            if markdown_content and self._can_generate_captions():
                logger.info("Step 2/2: Enhancing markdown with image captions...")
                enhanced_content, failed_count = self._enhance_markdown_with_captions(markdown_content)
                if failed_count > 0:
                    logger.warning(f"Markdown enhanced, but {failed_count} images failed to generate captions.")
                else:
                    logger.info("Markdown enhanced with image captions (all images succeeded).")
                return None, enhanced_content, None, failed_count
            else:
                logger.info("Skipping image caption enhancement (no AI client configured).")
                return None, markdown_content, None, 0

        except Exception as e:
            error_msg = f"Unexpected error during file parsing: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return None, None, error_msg, 0
    
    def _parse_text_file(self, file_path: str, filename: str) -> tuple[Optional[str], Optional[str], Optional[str], int]:
        """
        Parse plain text file directly without MinerU
        
        Args:
            file_path: Path to the file
            filename: Original filename
            
        Returns:
            Tuple of (batch_id, markdown_content, error_message, failed_image_count)
        """
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            logger.info(f"Text file read successfully: {len(content)} characters")
            
            # Enhance markdown with image captions if it contains images
            if content and self._can_generate_captions():
                # Check if content has markdown images
                if '![' in content and '](' in content:
                    logger.info("Text file contains images, enhancing with captions...")
                    enhanced_content, failed_count = self._enhance_markdown_with_captions(content)
                    if failed_count > 0:
                        logger.warning(f"Text file enhanced with image captions, but {failed_count} images failed to generate captions.")
                    else:
                        logger.info("Text file enhanced with image captions (all images succeeded).")
                    return None, enhanced_content, None, failed_count
            
            return None, content, None, 0
            
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    content = f.read()
                logger.info(f"Text file read successfully with GBK encoding: {len(content)} characters")
                
                if content and self._can_generate_captions() and '![' in content and '](' in content:
                    logger.info("Text file contains images, enhancing with captions...")
                    enhanced_content, failed_count = self._enhance_markdown_with_captions(content)
                    if failed_count > 0:
                        logger.warning(f"Text file enhanced with image captions, but {failed_count} images failed to generate captions.")
                    else:
                        logger.info("Text file enhanced with image captions (all images succeeded).")
                    return None, enhanced_content, None, failed_count
                
                return None, content, None, 0
            except Exception as e:
                error_msg = f"Failed to read text file with multiple encodings: {str(e)}"
                logger.error(error_msg)
                return None, None, error_msg, 0
        except Exception as e:
            error_msg = f"Failed to read text file: {str(e)}"
            logger.error(error_msg)
            return None, None, error_msg, 0
    
    def _parse_spreadsheet_file(self, file_path: str, filename: str) -> tuple[Optional[str], Optional[str], Optional[str], int]:
        """
        Parse spreadsheet files (xlsx, xls, csv) using markitdown
        
        Args:
            file_path: Path to the file
            filename: Original filename
            
        Returns:
            Tuple of (batch_id, markdown_content, error_message, failed_image_count)
        """
        try:
            # Use markitdown to convert spreadsheet to markdown
            md = MarkItDown()
            result = md.convert(file_path)
            markdown_content = result.text_content
            
            logger.info(f"Spreadsheet file converted successfully: {len(markdown_content)} characters")
            
            # Spreadsheet files typically don't have images, so no need for caption enhancement
            return None, markdown_content, None, 0
            
        except Exception as e:
            error_msg = f"Failed to parse spreadsheet file: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return None, None, error_msg, 0
    
    def _parse_with_docling(self, file_path: str, filename: str) -> tuple[Optional[str], Optional[str]]:
        """
        Parse file using Docling service

        Args:
            file_path: Path to the file to parse
            filename: Original filename

        Returns:
            Tuple of (markdown_content, error_message)
        """
        try:
            # Prepare multipart form data
            with open(file_path, 'rb') as f:
                files = {'files': (filename, f, 'application/octet-stream')}
                data = {
                    'to_formats': 'md',
                    'do_ocr': 'false',
                    'image_export_mode': 'embedded',
                    'pdf_backend': 'dlparse_v4'
                }

                # Call Docling API (sync endpoint)
                response = requests.post(
                    f"{self.docling_api_base}/v1/convert/file",
                    files=files,
                    data=data,
                    timeout=300  # 5 minutes for large files
                )

            if response.status_code != 200:
                error_msg = f"Docling API error: {response.status_code} - {response.text[:200]}"
                logger.error(error_msg)
                return None, error_msg

            result = response.json()

            # Check response status
            if result.get('status') != 'success':
                error_msg = f"Docling parsing failed: {result.get('errors', 'Unknown error')}"
                logger.error(error_msg)
                return None, error_msg

            # Extract markdown content
            md_content = result.get('document', {}).get('md_content', '')
            if not md_content:
                error_msg = "Docling returned empty markdown content"
                logger.error(error_msg)
                return None, error_msg

            logger.info(f"Docling parsing completed in {result.get('processing_time', 0):.2f}s")

            # Save embedded base64 images to local files and replace URLs
            md_content = self._save_base64_images(md_content)

            return md_content, None

        except requests.exceptions.Timeout:
            error_msg = "Docling API timeout (exceeded 5 minutes)"
            logger.error(error_msg)
            return None, error_msg
        except requests.exceptions.RequestException as e:
            error_msg = f"Docling API request failed: {str(e)}"
            logger.error(error_msg)
            return None, error_msg
        except Exception as e:
            error_msg = f"Unexpected error during Docling parsing: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return None, error_msg

    def _save_base64_images(self, markdown_content: str) -> str:
        """
        Extract base64 images from markdown, save to local files, and replace with URLs

        Args:
            markdown_content: Markdown with embedded base64 images

        Returns:
            Markdown with local image URLs
        """
        # Generate unique directory for this extraction
        extract_id = str(uuid.uuid4())[:8]

        # Get project root and create storage directory
        current_file = Path(__file__).resolve()
        backend_dir = current_file.parent.parent
        project_root = backend_dir.parent
        docling_storage = project_root / 'uploads' / 'docling_files' / extract_id
        docling_storage.mkdir(parents=True, exist_ok=True)

        logger.info(f"Saving images to: {docling_storage}")

        image_count = 0

        def save_and_replace(match):
            nonlocal image_count
            alt_text = match.group(1)
            img_data = match.group(2)

            # Skip if not a base64 data URL
            if not img_data.startswith('data:image/'):
                return match.group(0)

            try:
                # Parse data URL: data:image/png;base64,xxxxx
                header, b64_data = img_data.split(',', 1)
                # Extract image format from header
                img_format = header.split('/')[1].split(';')[0]  # png, jpeg, etc.

                # Decode base64
                img_bytes = base64.b64decode(b64_data)

                # Save to file
                image_count += 1
                img_filename = f"image_{image_count:06d}.{img_format}"
                img_path = docling_storage / img_filename
                with open(img_path, 'wb') as f:
                    f.write(img_bytes)

                # Return markdown with local URL
                new_url = f"/files/docling/{extract_id}/{img_filename}"
                logger.debug(f"Saved image: {img_filename} ({len(img_bytes)} bytes)")
                return f"![{alt_text}]({new_url})"

            except Exception as e:
                logger.warning(f"Failed to save base64 image: {str(e)}")
                return match.group(0)  # Keep original on error

        # Match markdown image syntax with data URLs
        pattern = r'!\[(.*?)\]\((data:image/[^)]+)\)'
        result = re.sub(pattern, save_and_replace, markdown_content)

        logger.info(f"Saved {image_count} images from markdown")
        return result

    
    def _enhance_markdown_with_captions(self, markdown_content: str) -> tuple[str, int]:
        """
        Enhance markdown by adding captions to images that don't have alt text
        
        Args:
            markdown_content: Original markdown content
            
        Returns:
            Tuple of (enhanced_markdown, failed_image_count)
        """
        if not self._can_generate_captions():
            return markdown_content, 0
        
        # Extract all image URLs from markdown (both with and without alt text)
        # Support both http/https URLs and relative paths
        image_pattern = r'!\[(.*?)\]\(([^\)]+)\)'
        matches = list(re.finditer(image_pattern, markdown_content))
        
        logger.info(f"Found {len(matches)} markdown image references")
        
        if not matches:
            logger.info("No markdown image syntax found")
            return markdown_content, 0
        
        # Filter to only images without alt text (empty brackets)
        images_to_caption = []
        for match in matches:
            alt_text = match.group(1).strip()
            image_url = match.group(2).strip()
            logger.debug(f"Image found: alt='{alt_text}', url='{image_url}'")
            
            if not alt_text:  # Only process images with empty alt text
                images_to_caption.append(match)
        
        if not images_to_caption:
            logger.info(f"Found {len(matches)} images in markdown, but all have descriptions. Skipping caption generation.")
            return markdown_content, 0
        
        logger.info(f"Found {len(images_to_caption)} images without descriptions out of {len(matches)} total, generating captions...")
        
        # Generate captions in parallel (only for images without alt text)
        image_urls = [match.group(2) for match in images_to_caption]
        captions, failed_count = self._generate_captions_parallel(image_urls)
        
        # Log results
        success_count = len(images_to_caption) - failed_count
        logger.info(f"Image caption generation completed: {success_count} succeeded, {failed_count} failed out of {len(images_to_caption)} total")
        
        # Replace image syntax with captioned version (in reverse order to maintain positions)
        enhanced_content = markdown_content
        for match, caption in zip(reversed(images_to_caption), reversed(captions)):
            old_text = match.group(0)
            url = match.group(2)
            # Use caption as alt text (empty if generation failed)
            new_text = f"![{caption}]({url})"
            enhanced_content = enhanced_content[:match.start()] + new_text + enhanced_content[match.end():]
        
        return enhanced_content, failed_count
    
    def _generate_captions_parallel(self, image_urls: List[str], max_workers: int = 12, max_retries: int = 3) -> tuple[List[str], int]:
        """
        Generate captions for multiple images in parallel with retry mechanism
        
        Args:
            image_urls: List of image URLs
            max_workers: Maximum number of parallel workers
            max_retries: Maximum number of retries for each image
            
        Returns:
            Tuple of (list of captions, number of failed images)
        """
        captions = [""] * len(image_urls)
        failed_count = 0
        
        def generate_with_retry(url: str, idx: int) -> tuple[int, str, bool]:
            """Generate caption with retry logic"""
            for attempt in range(max_retries):
                try:
                    caption = self._generate_single_caption(url)
                    if caption:
                        logger.debug(f"Generated caption for image {idx + 1}/{len(image_urls)} (attempt {attempt + 1})")
                        return (idx, caption, True)
                    else:
                        logger.warning(f"Empty caption for image {idx + 1} (attempt {attempt + 1}/{max_retries})")
                except Exception as e:
                    logger.warning(f"Failed to generate caption for image {idx + 1} (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(1 * (attempt + 1))  # Exponential backoff: 1s, 2s, 3s
            
            # All retries failed
            logger.error(f"Failed to generate caption for image {idx + 1} after {max_retries} attempts")
            return (idx, "", False)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_idx = {
                executor.submit(generate_with_retry, url, idx): idx
                for idx, url in enumerate(image_urls)
            }
            
            for future in as_completed(future_to_idx):
                try:
                    idx, caption, success = future.result()
                    captions[idx] = caption
                    if not success:
                        failed_count += 1
                except Exception as e:
                    idx = future_to_idx[future]
                    logger.error(f"Unexpected error generating caption for image {idx + 1}: {str(e)}")
                    failed_count += 1
        
        return captions, failed_count
    
    def _generate_single_caption(self, image_url: str) -> str:
        """
        Generate caption for a single image (supports both HTTP URLs and local paths)
        
        Args:
            image_url: URL or local path of the image
            
        Returns:
            Generated caption
        """
        try:
            # Load image based on URL type
            if image_url.startswith('http://') or image_url.startswith('https://'):
                # Download from HTTP(S) URL
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()
                image = Image.open(io.BytesIO(response.content))
            elif image_url.startswith('/files/mineru/'):
                # Local MinerU extracted file with prefix matching support
                from utils.path_utils import find_mineru_file_with_prefix

                # Find file with prefix matching
                img_path = find_mineru_file_with_prefix(image_url)

                if img_path is None or not img_path.exists():
                    logger.warning(f"Local image file not found (with prefix matching): {image_url}")
                    return ""

                image = Image.open(img_path)
            elif image_url.startswith('/files/docling/'):
                # Local Docling extracted file
                # URL format: /files/docling/{extract_id}/{filename}
                current_file = Path(__file__).resolve()
                backend_dir = current_file.parent.parent
                project_root = backend_dir.parent

                # Extract path after /files/docling/
                rel_path = image_url[len('/files/docling/'):]
                img_path = project_root / 'uploads' / 'docling_files' / rel_path

                if not img_path.exists():
                    logger.warning(f"Local Docling image file not found: {image_url}")
                    return ""

                image = Image.open(img_path)
            else:
                # Unsupported path type
                logger.warning(f"Unsupported image path type: {image_url}")
                return ""
            
            # Generate caption based on provider format
            prompt = "请用一句简短的中文描述这张图片的主要内容。只返回描述文字，不要其他解释。"
            
            if self._provider_format == 'openai':
                # Use OpenAI SDK format
                client = self._get_openai_client()
                if not client:
                    logger.warning("OpenAI client not initialized, skipping caption generation")
                    return ""
                
                # Encode image to base64
                buffered = io.BytesIO()
                if image.mode in ('RGBA', 'LA', 'P'):
                    image = image.convert('RGB')
                image.save(buffered, format="JPEG", quality=95)
                base64_image = base64.b64encode(buffered.getvalue()).decode('utf-8')
                
                response = client.chat.completions.create(
                    model=self.image_caption_model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                                {"type": "text", "text": prompt}
                            ]
                        }
                    ],
                    temperature=0.3
                )
                caption = response.choices[0].message.content.strip()
            else:
                # Use Gemini SDK format (default)
                from google.genai import types
                client = self._get_gemini_client()
                if not client:
                    logger.warning("Gemini client not initialized, skipping caption generation")
                    return ""
                
                result = client.models.generate_content(
                    model=self.image_caption_model,
                    contents=[image, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.3,  # Lower temperature for more consistent captions
                    )
                )
                caption = result.text.strip()
            
            return caption
            
        except Exception as e:
            logger.warning(f"Failed to generate caption for {image_url}: {str(e)}")
            return ""  # Return empty string on failure

