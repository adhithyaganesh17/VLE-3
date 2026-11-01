FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Final Hardened Stage ---
FROM python:3.12-slim

# Security: Install minimal runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: Create non-root unprivileged service user
RUN groupadd -g 10001 medora && \
    useradd -u 10001 -g medora -s /bin/sh -m appuser

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONPATH=/app

# Copy application source code
COPY --chown=appuser:medora . /app/backend

# Switch to non-root user
USER 10001:10001

EXPOSE 8000

# Healthcheck probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
