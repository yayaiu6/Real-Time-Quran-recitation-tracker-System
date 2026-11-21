# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS backend-build
WORKDIR /app
RUN python -m venv /opt/venv
COPY backend/pyproject.toml backend/requirements.lock ./backend/
COPY backend/app ./backend/app
RUN /opt/venv/bin/pip install --no-cache-dir -c backend/requirements.lock ./backend

FROM python:3.12-slim-bookworm
ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=backend-build /opt/venv /opt/venv
COPY backend/app ./backend/app
COPY --from=frontend-build /app/frontend/build ./frontend/build
COPY LICENSE ./
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD ["python", "-c", "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/api/health', timeout=3).close()"]
CMD ["uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
