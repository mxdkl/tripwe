# syntax=docker/dockerfile:1.7
FROM python:3.13-slim

# Bring in uv from its official image — much faster than pip and reuses the
# project's uv.lock for reproducible installs.
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Install deps first (cached layer) — only invalidated when these change.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App code
COPY main.py ./

# SQLite DB lives in a mounted volume so it survives container restarts.
ENV TRIPWE_DB=/data/tripwe.db
VOLUME ["/data"]

EXPOSE 8000

# 0.0.0.0 so the container is reachable from the host; in production we still
# bind only to 127.0.0.1 on the host side (see compose.yml port mapping).
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
