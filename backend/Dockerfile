# 使用 Python 3.10 作为基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv（使用官方安装脚本，避免 ghcr.io 网络问题）
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/uv && \
    chmod +x /usr/local/bin/uv

# 下载中文字体（用于可编辑 PPT 导出）
# 使用 Google Fonts GitHub 仓库下载完整字体（非子集版本）
RUN mkdir -p /app/backend/fonts && \
    curl -L -o /app/backend/fonts/NotoSansSC-Regular.ttf \
    "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf" && \
    curl -L -o /app/backend/fonts/NotoSerifSC-Regular.ttf \
    "https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Regular.otf" && \
    curl -L -o /app/backend/fonts/LXGWWenKai-Regular.ttf \
    "https://github.com/lxgw/LxgwWenKai/releases/download/v1.330/LXGWWenKai-Regular.ttf"

# 复制项目配置文件
COPY pyproject.toml ./
COPY uv.lock* ./

# 设置 uv 超时时间和镜像源（解决网络慢导致的下载失败）
ENV UV_HTTP_TIMEOUT=600
ENV UV_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/

# 安装 Python 依赖
# 如果有 uv.lock 文件则使用 --frozen，否则生成新的锁定文件
RUN if [ -f uv.lock ]; then \
        uv sync --frozen; \
    else \
        uv sync; \
    fi

# 复制后端代码
COPY backend/ ./backend/

# 创建必要的目录
RUN mkdir -p /app/backend/instance /app/uploads

ENV PYTHONPATH=/app
ENV FLASK_APP=backend/app.py

# 暴露端口
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["sh", "-c", "curl -f http://localhost:${PORT:-5000}/health || exit 1"]

# 启动应用
CMD ["sh", "-c", "uv run --directory backend alembic upgrade head && uv run --directory backend python app.py"]

